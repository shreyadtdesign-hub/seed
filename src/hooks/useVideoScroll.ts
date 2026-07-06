"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { computeSceneState } from "@/lib/SceneController";
import { getScrollController } from "@/lib/ScrollController";
import { LOOP_COPIES } from "@/lib/scenes";
import type { VideoManager } from "@/lib/VideoManager";

gsap.registerPlugin(ScrollTrigger);

interface UseVideoScrollOptions {
  trackRef: RefObject<HTMLElement | null>;
  pinRef: RefObject<HTMLElement | null>;
  sceneCount: number;
  videoManager: VideoManager;
  onProgress?: (progress: number) => void;
  reducedMotion?: boolean;
  /** Per-boundary crossfade override — see SceneController.computeSceneState. */
  transitionRatios?: number[];
}

/**
 * Pins the viewport for the full scroll track and, on every scrub tick,
 * converts scroll progress into per-scene opacity + currentTime via
 * SceneController, then hands it straight to VideoManager. Only React
 * state that changes discretely (which scene is "current") triggers a
 * re-render — everything else is imperative DOM work.
 *
 * The track physically holds LOOP_COPIES back-to-back copies of the film
 * so there's always real scroll room in both directions; only the middle
 * copy is ever "live". Whenever the raw scroll position drifts near either
 * outer edge of that buffer, it's silently jumped by exactly one copy's
 * length, which is invisible because the displayed scene only depends on
 * position within a single cycle (untouched by the jump) — this is what
 * makes the film loop forever without an ever-growing DOM.
 */
export function useVideoScroll({
  trackRef,
  pinRef,
  sceneCount,
  videoManager,
  onProgress,
  reducedMotion = false,
  transitionRatios,
}: UseVideoScrollOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    const lenis = getScrollController();
    const jumpTo = (value: number) => {
      if (lenis) {
        lenis.scrollTo(value, { immediate: true, force: true });
      } else {
        window.scrollTo(0, value);
      }
    };

    // Start inside the middle copy so there's a full copy's worth of room
    // to scroll backward, as well as forward, before the first correction.
    const copyLength = () => track.offsetHeight / LOOP_COPIES;
    jumpTo(copyLength());

    const trigger = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      pin,
      pinSpacing: false,
      // Lenis already supplies scroll inertia/easing, so scrub must track
      // it 1:1 — an eased scrub value here would double-smooth on top of
      // Lenis' own easing, reading as laggy/rubbery instead of buttery.
      scrub: true,
      onUpdate: (self) => {
        const length = copyLength();
        let rawScroll = self.scroll();

        // Only correct near the buffer's outer edges, not at every
        // internal copy boundary — otherwise the very first attempt to
        // scroll backward past the middle copy would immediately snap
        // forward again, making it impossible to ever scroll backward.
        if (rawScroll < length * 0.5) {
          rawScroll += length;
          jumpTo(rawScroll);
        } else if (rawScroll > length * 2.5) {
          rawScroll -= length;
          jumpTo(rawScroll);
        }

        const cycleProgress = (((rawScroll % length) + length) % length) / length;
        const state = computeSceneState(cycleProgress, sceneCount, transitionRatios);
        videoManager.applyState(state);
        onProgress?.(cycleProgress);

        if (state.currentIndex !== currentIndexRef.current) {
          currentIndexRef.current = state.currentIndex;
          setCurrentIndex(state.currentIndex);
        }
      },
    });

    return () => trigger.kill();
  }, [trackRef, pinRef, sceneCount, videoManager, onProgress, reducedMotion, transitionRatios]);

  return currentIndex;
}
