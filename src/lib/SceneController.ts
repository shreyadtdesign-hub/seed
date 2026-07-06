/**
 * Pure functions mapping a single repeating cycle progress (0..1, looping)
 * across the whole film to per-scene playback state. The film loops —
 * scene 0 crossfades in from the last scene's tail exactly like any other
 * cut — so there's no "first"/"last" special case, every scene has a
 * previous and next neighbor, wrapping around. Every scene's local
 * progress is a continuous, clamped function of progress (frozen at its
 * first/last frame outside its own segment), so crossfades never cause a
 * seek jump — the outgoing clip holds its last frame while fading out, the
 * incoming clip holds its first frame while fading in.
 */

export interface SceneState {
  /** Segment the scroll position is primarily inside. */
  currentIndex: number;
  prevIndex: number;
  nextIndex: number;
  /** Per-scene opacity, index-aligned with the scenes array. */
  opacities: number[];
  /** Per-scene local playback progress (0..1), index-aligned. */
  localProgress: number[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Shortest signed distance from x to the nearest integer, wrapped into [-0.5, 0.5). */
const wrapCentered = (x: number) => x - Math.round(x);

/**
 * Fraction of a single scene's segment used, on each side of a boundary,
 * to crossfade into/out of its neighbor. 0.1 means a 10%-of-segment ramp
 * on either side of the cut, so ~20% of a segment's scroll length is spent
 * blending between two clips.
 */
export const DEFAULT_TRANSITION_RATIO = 0.1;

export function computeSceneState(
  cycleProgress: number,
  sceneCount: number,
  /**
   * Optional per-boundary override, index-aligned with the scenes array:
   * transitionRatios[i] is the ratio used for the cut INTO scene i (its
   * fade-in), which is the same cut as the previous scene's fade-out — so
   * both sides of a boundary always share one ratio. Missing entries (or
   * omitting the array) fall back to DEFAULT_TRANSITION_RATIO. A ratio of
   * 0 collapses that one cut to a hard cut with no blend, without
   * affecting any other boundary.
   */
  transitionRatios: number[] = [],
): SceneState {
  const progress = ((cycleProgress % 1) + 1) % 1;
  const segmentLength = 1 / sceneCount;
  const ratioAt = (i: number) => transitionRatios[((i % sceneCount) + sceneCount) % sceneCount] ?? DEFAULT_TRANSITION_RATIO;

  const rawIndex = Math.floor(progress * sceneCount);
  const currentIndex = Math.min(sceneCount - 1, Math.max(0, rawIndex));
  const prevIndex = (currentIndex - 1 + sceneCount) % sceneCount;
  const nextIndex = (currentIndex + 1) % sceneCount;

  const opacities = new Array<number>(sceneCount).fill(0);
  const localProgress = new Array<number>(sceneCount).fill(0);

  // Only current/prev/next can ever be visible or mounted (see
  // VideoManager's window), so skip computing the rest on every tick.
  // A Set naturally collapses index collisions on very small sceneCounts.
  for (const i of new Set([prevIndex, currentIndex, nextIndex])) {
    const start = i * segmentLength;
    // Signed distance from progress to this scene's start, taking the
    // shortest way around the loop — this is what makes scene 0's fade-in
    // naturally blend from the last scene's tail as progress wraps past 1.
    const d = wrapCentered(progress - start);

    localProgress[i] = clamp01(d / segmentLength);

    // startHalf is this scene's own fade-in half-width; endHalf is the
    // next scene's fade-in half-width, i.e. this scene's fade-out — using
    // ratioAt(i+1) keeps both sides of that shared boundary symmetric.
    // When a half is exactly 0, its ramp branch's interval degenerates to
    // empty (d < x and d < x are the same test), so it's never entered —
    // that cut becomes an instant hard step with no division-by-zero risk.
    const startHalf = segmentLength * ratioAt(i);
    const endHalf = segmentLength * ratioAt(i + 1);

    let opacity: number;
    if (d < -startHalf) {
      opacity = 0;
    } else if (d < startHalf) {
      opacity = clamp01((d + startHalf) / (2 * startHalf));
    } else if (d < segmentLength - endHalf) {
      opacity = 1;
    } else if (d < segmentLength + endHalf) {
      opacity = clamp01(1 - (d - (segmentLength - endHalf)) / (2 * endHalf));
    } else {
      opacity = 0;
    }

    opacities[i] = opacity;
  }

  return { currentIndex, prevIndex, nextIndex, opacities, localProgress };
}
