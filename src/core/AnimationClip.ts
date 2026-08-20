import type { AnimationClipData } from './types';

export function createDefaultClip(row = 0, columns = 1): AnimationClipData {
  return {
    row,
    frames: Array.from({ length: Math.max(1, columns) }, (_, i) => i),
    fps: 8,
    frameDurations: {},
    playback: {
      speed: 1,
      loopMode: 'loop',
      loopCount: -1,
      randomStart: false
    },
    transform: {
      anchor: { x: 0.5, y: 1 },
      offset: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      flipX: false,
      flipY: false
    },
    frameOffsets: {},
    events: [],
    collision: {
      frames: {}
    }
  };
}

export function cloneClip(clip: AnimationClipData): AnimationClipData {
  return structuredClone(clip);
}
