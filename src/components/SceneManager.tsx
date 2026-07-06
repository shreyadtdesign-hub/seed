"use client";

import { useEffect, useRef } from "react";
import { scenes, VH_PER_SCENE, LOOP_COPIES, TRANSITION_RATIOS } from "@/lib/scenes";
import { getVideoWindow, VideoManager } from "@/lib/VideoManager";
import { VideoPlayer } from "./VideoPlayer";
import { useVideoScroll } from "@/hooks/useVideoScroll";

interface SceneManagerProps {
  onProgress?: (progress: number) => void;
  onFirstFrameReady?: () => void;
  reducedMotion?: boolean;
}

/**
 * Stitches the clips into one continuous, scroll-scrubbed film that loops
 * forever. The track below (LOOP_COPIES stacked copies of the full film)
 * provides the scroll distance; the inner viewport stays pinned for its
 * entire length while SceneController + VideoManager drive currentTime/
 * opacity on whichever three clips are mounted, and useVideoScroll keeps
 * the real scroll position recentered within the middle copy.
 */
export function SceneManager({ onProgress, onFirstFrameReady, reducedMotion = false }: SceneManagerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoManagerRef = useRef<VideoManager | null>(null);
  if (!videoManagerRef.current) {
    videoManagerRef.current = new VideoManager();
  }
  const videoManager = videoManagerRef.current;

  const currentIndex = useVideoScroll({
    trackRef,
    pinRef,
    sceneCount: scenes.length,
    videoManager,
    onProgress,
    reducedMotion,
    transitionRatios: TRANSITION_RATIOS,
  });

  const { mounted } = getVideoWindow(currentIndex, scenes.length);

  useEffect(() => {
    videoManager.setOnFirstFrameReady((index) => {
      if (index === 0) onFirstFrameReady?.();
    });
    return () => videoManager.setOnFirstFrameReady(null);
  }, [videoManager, onFirstFrameReady]);

  useEffect(() => {
    return () => videoManager.dispose();
  }, [videoManager]);

  return (
    <div ref={trackRef} style={{ height: `${scenes.length * VH_PER_SCENE * LOOP_COPIES}vh` }} className="relative">
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden bg-black">
        {mounted.map((index) => (
          <VideoPlayer
            key={index}
            scene={scenes[index]}
            videoManager={videoManager}
            priority={index <= 1 ? "high" : "low"}
          />
        ))}
      </div>
    </div>
  );
}
