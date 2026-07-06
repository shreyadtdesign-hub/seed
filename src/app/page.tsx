"use client";

import { useCallback, useRef, useState } from "react";
import { SceneManager } from "@/components/SceneManager";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Intro } from "@/components/Intro";
import { Overlay } from "@/components/Overlay";
import { useLenis } from "@/hooks/useLenis";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export default function Home() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [hasStartedScrolling, setHasStartedScrolling] = useState(false);
  const hasStartedRef = useRef(false);

  useLenis(prefersReducedMotion);

  const handleFirstFrameReady = useCallback(() => setFirstFrameReady(true), []);
  const handleLoaderDone = useCallback(() => setLoaderDone(true), []);

  const handleProgress = useCallback((progress: number) => {
    if (!hasStartedRef.current && progress > 0.004) {
      hasStartedRef.current = true;
      setHasStartedScrolling(true);
    }
  }, []);

  return (
    <>
      <LoadingScreen ready={firstFrameReady} onDone={handleLoaderDone} />
      <Intro visible={loaderDone && !hasStartedScrolling} />
      <Overlay showScrollHint={loaderDone && !hasStartedScrolling} />
      <SceneManager
        onProgress={handleProgress}
        onFirstFrameReady={handleFirstFrameReady}
        reducedMotion={prefersReducedMotion}
      />
    </>
  );
}
