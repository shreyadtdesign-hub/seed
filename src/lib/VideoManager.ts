/**
 * Decides which scene indices should be mounted in the DOM (current, prev,
 * next only) and drives the mounted <video> elements imperatively —
 * seeking + opacity are set directly on the elements every scrub tick so
 * driving playback never triggers a React re-render.
 */

import type { SceneState } from "./SceneController";

export interface VideoWindow {
  /** Indices that must have a <video> element mounted right now. */
  mounted: number[];
  /** Indices worth warming up next (one clip further ahead). */
  preload: number[];
}

export function getVideoWindow(currentIndex: number, sceneCount: number): VideoWindow {
  // The film loops, so neighbors wrap around (scene 0's prev is the last
  // scene, the last scene's next is scene 0) — kept in [prev, current,
  // next] order, not numeric order, so DOM stacking stays consistent
  // across the wrap the same way it is at every other cut.
  const prev = (currentIndex - 1 + sceneCount) % sceneCount;
  const next = (currentIndex + 1) % sceneCount;
  const mounted = [prev, currentIndex, next].filter((value, i, arr) => arr.indexOf(value) === i);

  const preload = new Set(mounted);
  preload.add((currentIndex + 2) % sceneCount);

  return {
    mounted,
    preload: [...preload],
  };
}

/** Frame duration fallback used before a clip's real duration is known. */
const FALLBACK_DURATION = 8;
/** Skip a seek if we're already within this fraction of a frame (~1/24s). */
const SEEK_EPSILON = 1 / 48;

type FrameReadyListener = (index: number) => void;

export class VideoManager {
  private elements = new Map<number, HTMLVideoElement>();
  private durations = new Map<number, number>();
  private frameCallbackIds = new Map<number, number>();
  private onFirstFrameReady: FrameReadyListener | null = null;
  private readyFired = new Set<number>();
  private abortControllers = new Map<number, AbortController>();
  // Coalesces seeks requested while a previous one is still resolving —
  // scrolling fast fires onUpdate far faster than the decoder can complete
  // a seek, and setting currentTime again mid-seek makes some browsers
  // abort/restart the in-flight one, which is exactly what reads as
  // stutter. Instead of issuing every request immediately, only the
  // latest target is kept and applied the moment the current seek settles.
  private pendingSeek = new Map<number, number>();

  register(index: number, el: HTMLVideoElement) {
    this.elements.set(index, el);
    const controller = new AbortController();
    this.abortControllers.set(index, controller);
    const { signal } = controller;

    const cacheDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        this.durations.set(index, el.duration);
      }
    };

    el.addEventListener("loadedmetadata", cacheDuration, { signal });
    cacheDuration();

    el.addEventListener(
      "seeked",
      () => {
        const target = this.pendingSeek.get(index);
        if (target === undefined) return;
        this.pendingSeek.delete(index);
        if (Math.abs(el.currentTime - target) > SEEK_EPSILON) {
          this.seekTo(el, target);
        }
      },
      { signal },
    );

    const markReady = () => {
      if (!this.readyFired.has(index)) {
        this.readyFired.add(index);
        this.onFirstFrameReady?.(index);
      }
    };

    if (typeof el.requestVideoFrameCallback === "function") {
      const id = el.requestVideoFrameCallback(markReady);
      this.frameCallbackIds.set(index, id);
    } else {
      el.addEventListener("loadeddata", markReady, { once: true, signal });
    }
  }

  unregister(index: number) {
    const el = this.elements.get(index);
    if (el) {
      const cbId = this.frameCallbackIds.get(index);
      if (cbId !== undefined && typeof el.cancelVideoFrameCallback === "function") {
        el.cancelVideoFrameCallback(cbId);
      }
      this.abortControllers.get(index)?.abort();
      el.pause();
      // Sources come from <source> children, not a src attribute, so
      // removeAttribute("src") was a no-op — load() would then just
      // re-read those children and restart decoding the exact clip
      // we're trying to release. Assigning src directly overrides the
      // <source> resolution and actually detaches the resource, so this
      // decoder is freed before the next clip's is acquired.
      el.src = "";
      el.load();
    }
    this.elements.delete(index);
    this.durations.delete(index);
    this.frameCallbackIds.delete(index);
    this.readyFired.delete(index);
    this.abortControllers.delete(index);
    this.pendingSeek.delete(index);
  }

  setOnFirstFrameReady(listener: FrameReadyListener | null) {
    this.onFirstFrameReady = listener;
  }

  private seekTo(el: HTMLVideoElement, target: number) {
    if (typeof el.fastSeek === "function") {
      el.fastSeek(target);
    } else {
      el.currentTime = target;
    }
  }

  /** Applies opacity + scrubbed currentTime to every currently mounted video. */
  applyState(state: SceneState) {
    this.elements.forEach((el, index) => {
      const opacity = state.opacities[index] ?? 0;
      el.style.opacity = String(opacity);

      if (opacity <= 0) return;

      const duration = this.durations.get(index) ?? FALLBACK_DURATION;
      const target = state.localProgress[index] * duration;

      if (Math.abs(el.currentTime - target) > SEEK_EPSILON) {
        if (el.seeking) {
          // A seek is already resolving — remember where we actually want
          // to land and let the "seeked" handler above apply it, rather
          // than piling another seek on top of the one in flight.
          this.pendingSeek.set(index, target);
        } else {
          this.seekTo(el, target);
        }
      }
    });
  }

  dispose() {
    this.elements.forEach((_el, index) => this.unregister(index));
  }
}
