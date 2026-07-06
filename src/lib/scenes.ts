export interface Scene {
  index: number;
  mp4: string;
  webm: string;
}

const SCENE_COUNT = 11;

export const scenes: Scene[] = Array.from({ length: SCENE_COUNT }, (_, i) => {
  const id = String(i + 1).padStart(2, "0");
  return {
    index: i,
    mp4: `/videos/${id}.mp4`,
    webm: `/videos/${id}.webm`,
  };
});

/** Scroll track height per scene, in viewport-height units. */
export const VH_PER_SCENE = 220;
