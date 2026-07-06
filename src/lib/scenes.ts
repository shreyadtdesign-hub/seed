import { DEFAULT_TRANSITION_RATIO } from "./SceneController";

export interface Scene {
  index: number;
  mp4: string;
  webm: string;
}

// Clips 01, 06 and 08 are cut from the film — playback opens on 02, 05
// flows directly into 07, and 07 flows directly into 09. The source files
// in public/videos keep their original numbering; this list is the only
// place the cuts are expressed.
const CLIP_IDS = ["02", "03", "04", "05", "07", "09", "10", "11"];

// next/image and next/link get the configured basePath automatically, but
// raw <source src> strings don't — prefix them by hand so assets resolve
// correctly when served from a subpath (e.g. GitHub Pages' /seed/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const scenes: Scene[] = CLIP_IDS.map((id, i) => ({
  index: i,
  mp4: `${basePath}/videos/${id}.mp4`,
  webm: `${basePath}/videos/${id}.webm`,
}));

/**
 * Per-boundary crossfade ratio, index-aligned with `scenes` (see
 * SceneController.computeSceneState for exactly what index i means here).
 * Three cuts blend two clips whose compositions are too similar to
 * dissolve cleanly — the near-duplicate-but-misaligned overlap reads as a
 * distracting double-exposure "ghost" instead, unlike every other cut,
 * which blends between visually distinct scenes:
 *   - into 10, and into 11: 09/10/11 all share close-up leaf/butterfly framing.
 *   - into 02 (the loop's wraparound, from 11 back to 02): both clips
 *     feature a near-identical spinning falling seed.
 * Those three cuts use a hard cut instead, without touching the clips
 * themselves or any other transition.
 */
export const TRANSITION_RATIOS = CLIP_IDS.map((id) => (id === "02" || id === "10" || id === "11" ? 0 : DEFAULT_TRANSITION_RATIO));

/** Scroll track height per scene, in viewport-height units. */
export const VH_PER_SCENE = 220;

/**
 * How many copies of the full film are stacked in the physical scroll
 * track, so there's always real scroll room in both directions. Only the
 * middle copy is ever "live" — see useVideoScroll for how drifting toward
 * an outer copy gets silently corrected back, making the film loop
 * forever without an ever-growing DOM.
 */
export const LOOP_COPIES = 3;
