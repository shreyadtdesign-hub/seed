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
  const mounted = new Set<number>([currentIndex]);
  if (currentIndex > 0) mounted.add(currentIndex - 1);
  if (currentIndex < sceneCount - 1) mounted.add(currentIndex + 1);

  const preload = new Set(mounted);
  if (currentIndex + 2 < sceneCount) preload.add(currentIndex + 2);

  return {
    mounted: [...mounted].sort((a, b) => a - b),
    preload: [...preload].sort((a, b) => a - b),
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

  register(index: number, el: HTMLVideoElement) {
    this.elements.set(index, el);

    const cacheDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        this.durations.set(index, el.duration);
      }
    };

    el.addEventListener("loadedmetadata", cacheDuration);
    cacheDuration();

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
      el.addEventListener("loadeddata", markReady, { once: true });
    }
  }

  unregister(index: number) {
    const el = this.elements.get(index);
    if (el) {
      const cbId = this.frameCallbackIds.get(index);
      if (cbId !== undefined && typeof el.cancelVideoFrameCallback === "function") {
        el.cancelVideoFrameCallback(cbId);
      }
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    this.elements.delete(index);
    this.durations.delete(index);
    this.frameCallbackIds.delete(index);
    this.readyFired.delete(index);
  }

  setOnFirstFrameReady(listener: FrameReadyListener | null) {
    this.onFirstFrameReady = listener;
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
        if (typeof el.fastSeek === "function") {
          el.fastSeek(target);
        } else {
          el.currentTime = target;
        }
      }
    });
  }

  dispose() {
    this.elements.forEach((_el, index) => this.unregister(index));
  }
}
