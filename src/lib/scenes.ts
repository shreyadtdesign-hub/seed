export interface Scene {
  index: number;
  mp4: string;
  webm: string;
}

const SCENE_COUNT = 11;

// next/image and next/link get the configured basePath automatically, but
// raw <source src> strings don't — prefix them by hand so assets resolve
// correctly when served from a subpath (e.g. GitHub Pages' /seed/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const scenes: Scene[] = Array.from({ length: SCENE_COUNT }, (_, i) => {
  const id = String(i + 1).padStart(2, "0");
  return {
    index: i,
    mp4: `${basePath}/videos/${id}.mp4`,
    webm: `${basePath}/videos/${id}.webm`,
  };
});

/** Scroll track height per scene, in viewport-height units. */
export const VH_PER_SCENE = 220;
