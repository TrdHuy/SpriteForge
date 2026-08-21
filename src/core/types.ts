export type Vec2 = { x: number; y: number };

export type TransparencyMode = 'nativeAlpha' | 'chromaKey' | 'none';
export type LoopMode = 'once' | 'loop' | 'pingPong';
export type CollisionKind = 'body' | 'hurt' | 'hit';

export interface TransparencyConfig {
  mode: TransparencyMode;
  color: string;
  tolerance: number;
}

export interface SpriteSheetConfig {
  image: string;
  rows: number;
  columns: number;
  frameWidth?: number;
  frameHeight?: number;
  margin: Vec2;
  spacing: Vec2;
  transparency: TransparencyConfig;
}

export interface PlaybackConfig {
  speed: number;
  loopMode: LoopMode;
  loopCount: number;
  randomStart: boolean;
}

export interface TransformConfig {
  anchor: Vec2;
  offset: Vec2;
  scale: Vec2;
  flipX: boolean;
  flipY: boolean;
}

export interface AnimationEventData {
  frame: number;
  name: string;
  payload?: unknown;
}

export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameCollisionData {
  bodyBoxes?: CollisionBox[];
  hurtboxes?: CollisionBox[];
  hitboxes?: CollisionBox[];
}

export interface CollisionData {
  defaultBodyBox?: CollisionBox;
  frames: Record<string, FrameCollisionData>;
}

/** V2 clips use row-major global source-frame indexes across the whole sprite sheet. */
export interface AnimationClipData {
  frames: number[];
  fps: number;
  frameDurations: Record<string, number>;
  playback: PlaybackConfig;
  transform: TransformConfig;
  frameOffsets: Record<string, Vec2>;
  events: AnimationEventData[];
  collision: CollisionData;
}

export interface AnimationMetadataV2 {
  version: 2;
  spriteSheet: SpriteSheetConfig;
  animations: Record<string, AnimationClipData>;
}

export type AnimationMetadata = AnimationMetadataV2;
/** Compatibility alias for existing internal imports; serialized metadata is V2. */
export type AnimationMetadataV1 = AnimationMetadataV2;

export interface SpriteProjectV1 {
  projectVersion: 1;
  metadata: AnimationMetadataV2;
  editor: {
    selectedClip: string | null;
    previewZoom: number;
    showGrid: boolean;
    showAnchor: boolean;
    showGround: boolean;
    showFrameBounds: boolean;
    showCollision: boolean;
  };
}

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
