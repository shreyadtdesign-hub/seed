export interface Scene {
  index: number;
  mp4: string;
  webm: string;
}

// Clips 01 and 08 are cut from the film — playback opens on 02, and 07
// flows directly into 09. The source files in public/videos keep their
// original numbering; this list is the only place the cuts are expressed.
const CLIP_IDS = ["02", "03", "04", "05", "06", "07", "09", "10", "11"];

// next/image and next/link get the configured basePath automatically, but
// raw <source src> strings don't — prefix them by hand so assets resolve
// correctly when served from a subpath (e.g. GitHub Pages' /seed/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const scenes: Scene[] = CLIP_IDS.map((id, i) => ({
  index: i,
  mp4: `${basePath}/videos/${id}.mp4`,
  webm: `${basePath}/videos/${id}.webm`,
}));

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
