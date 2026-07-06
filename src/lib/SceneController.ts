/**
 * Pure functions mapping a single global scroll progress (0..1) across the
 * whole film to per-scene playback state. Every scene's local progress is a
 * continuous, clamped function of global progress (frozen at its first/last
 * frame outside its own segment), so crossfades never cause a seek jump —
 * the outgoing clip holds its last frame while fading out, the incoming
 * clip holds its first frame while fading in.
 */

export interface SceneState {
  /** Segment the scroll position is primarily inside. */
  currentIndex: number;
  prevIndex: number | null;
  nextIndex: number | null;
  /** Per-scene opacity, index-aligned with the scenes array. */
  opacities: number[];
  /** Per-scene local playback progress (0..1), index-aligned. */
  localProgress: number[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Fraction of a single scene's segment used, on each side of a boundary,
 * to crossfade into/out of its neighbor. 0.1 means a 10%-of-segment ramp
 * on either side of the cut, so ~20% of a segment's scroll length is spent
 * blending between two clips.
 */
export const DEFAULT_TRANSITION_RATIO = 0.1;

export function computeSceneState(
  globalProgress: number,
  sceneCount: number,
  transitionRatio: number = DEFAULT_TRANSITION_RATIO,
): SceneState {
  const progress = clamp01(globalProgress);
  const segmentLength = 1 / sceneCount;
  const half = segmentLength * transitionRatio;

  const rawIndex = Math.floor(progress * sceneCount);
  const currentIndex = Math.min(sceneCount - 1, Math.max(0, rawIndex));

  const opacities = new Array<number>(sceneCount).fill(0);
  const localProgress = new Array<number>(sceneCount).fill(0);

  // Only current/prev/next can ever be visible or mounted (see
  // VideoManager's window), so skip computing the rest on every tick.
  const windowStart = Math.max(0, currentIndex - 1);
  const windowEnd = Math.min(sceneCount - 1, currentIndex + 1);

  for (let i = windowStart; i <= windowEnd; i++) {
    const start = i * segmentLength;
    const end = start + segmentLength;

    localProgress[i] = clamp01((progress - start) / segmentLength);

    const isFirst = i === 0;
    const isLast = i === sceneCount - 1;

    let opacity: number;
    if (progress < start - half) {
      opacity = 0;
    } else if (progress < start + half) {
      opacity = isFirst ? 1 : clamp01((progress - (start - half)) / (2 * half));
    } else if (progress < end - half) {
      opacity = 1;
    } else if (progress < end + half) {
      opacity = isLast ? 1 : 1 - clamp01((progress - (end - half)) / (2 * half));
    } else {
      opacity = 0;
    }

    opacities[i] = opacity;
  }

  return {
    currentIndex,
    prevIndex: currentIndex > 0 ? currentIndex - 1 : null,
    nextIndex: currentIndex < sceneCount - 1 ? currentIndex + 1 : null,
    opacities,
    localProgress,
  };
}
