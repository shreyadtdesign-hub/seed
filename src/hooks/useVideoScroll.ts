"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { computeSceneState } from "@/lib/SceneController";
import type { VideoManager } from "@/lib/VideoManager";

gsap.registerPlugin(ScrollTrigger);

interface UseVideoScrollOptions {
  trackRef: RefObject<HTMLElement | null>;
  pinRef: RefObject<HTMLElement | null>;
  sceneCount: number;
  videoManager: VideoManager;
  onProgress?: (progress: number) => void;
  reducedMotion?: boolean;
}

/**
 * Pins the viewport for the full scroll track and, on every scrub tick,
 * converts scroll progress into per-scene opacity + currentTime via
 * SceneController, then hands it straight to VideoManager. Only React
 * state that changes discretely (which scene is "current") triggers a
 * re-render — everything else is imperative DOM work.
 */
export function useVideoScroll({
  trackRef,
  pinRef,
  sceneCount,
  videoManager,
  onProgress,
  reducedMotion = false,
}: UseVideoScrollOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    const trigger = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      pin,
      pinSpacing: false,
      scrub: reducedMotion ? true : 0.4,
      onUpdate: (self) => {
        const state = computeSceneState(self.progress, sceneCount);
        videoManager.applyState(state);
        onProgress?.(self.progress);

        if (state.currentIndex !== currentIndexRef.current) {
          currentIndexRef.current = state.currentIndex;
          setCurrentIndex(state.currentIndex);
        }
      },
    });

    return () => trigger.kill();
  }, [trackRef, pinRef, sceneCount, videoManager, onProgress, reducedMotion]);

  return currentIndex;
}
