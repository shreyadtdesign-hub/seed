/**
 * Wires Lenis' smooth-scroll RAF loop into GSAP's ticker so ScrollTrigger
 * reads a single, consistent scroll source. Never attach raw wheel/touch
 * listeners elsewhere — everything downstream reacts to this instead.
 */

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;

export interface ScrollControllerOptions {
  /** Disable smoothing (native scroll) for prefers-reduced-motion. */
  reducedMotion?: boolean;
}

export function createScrollController(options: ScrollControllerOptions = {}): Lenis {
  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({
    duration: options.reducedMotion ? 0 : 1.2,
    smoothWheel: !options.reducedMotion,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
  });

  lenis.on("scroll", ScrollTrigger.update);

  tickerCallback = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function destroyScrollController() {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  lenis?.destroy();
  lenis = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

export function getScrollController(): Lenis | null {
  return lenis;
}
