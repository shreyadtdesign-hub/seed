"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/scenes";
import type { VideoManager } from "@/lib/VideoManager";

interface VideoPlayerProps {
  scene: Scene;
  videoManager: VideoManager;
  /** "high" warms the decoder eagerly; "low" only fetches metadata. */
  priority?: "high" | "low";
}

export function VideoPlayer({ scene, videoManager, priority = "low" }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    videoManager.register(scene.index, el);
    return () => videoManager.unregister(scene.index);
  }, [scene.index, videoManager]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ opacity: 0, willChange: "opacity", transform: "translateZ(0)" }}
      muted
      playsInline
      preload={priority === "high" ? "auto" : "metadata"}
      aria-hidden="true"
    >
      <source src={scene.webm} type="video/webm" />
      <source src={scene.mp4} type="video/mp4" />
    </video>
  );
}
