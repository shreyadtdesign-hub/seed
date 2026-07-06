export interface Scene {
  index: number;
  mp4: string;
  webm: string;
}

// Clip 08 is cut from the film — 07 flows directly into 09. The source
// files in public/videos keep their original numbering; this list is the
// only place the cut is expressed.
const CLIP_IDS = ["01", "02", "03", "04", "05", "06", "07", "09", "10", "11"];

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
