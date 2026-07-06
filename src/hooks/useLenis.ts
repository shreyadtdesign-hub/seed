"use client";

import { useEffect } from "react";
import { createScrollController, destroyScrollController } from "@/lib/ScrollController";

export function useLenis(reducedMotion: boolean) {
  useEffect(() => {
    createScrollController({ reducedMotion });
    return () => destroyScrollController();
  }, [reducedMotion]);
}
