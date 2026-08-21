import type { AnimationClipData, AnimationMetadataV1, CollisionBox, FrameCollisionData, SpriteProjectV1, SpriteSheetConfig, Vec2 } from '../core/types';

type LegacyClipV1 = AnimationClipData & { row: number };
type LegacyMetadataV1 = { version: 1; spriteSheet: SpriteSheetConfig; animations: Record<string, LegacyClipV1> };

export function createDefaultMetadata(image = ''): AnimationMetadataV1 {
  return {
    version: 2,
    spriteSheet: {
      image,
      rows: 4,
      columns: 8,
      margin: { x: 0, y: 0 },
      spacing: { x: 0, y: 0 },
      transparency: { mode: 'nativeAlpha', color: '#000000', tolerance: 10 }
    },
    animations: {}
  };
}

export function validateMetadata(metadata: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(metadata)) return ['Metadata must be a JSON object.'];
  if (metadata.version !== 2) errors.push('Unsupported metadata version. Expected version 2.');
  if (!isObject(metadata.spriteSheet)) errors.push('Missing spriteSheet object.');
  else validateSheet(metadata.spriteSheet as unknown as SpriteSheetConfig, errors);
  if (!isObject(metadata.animations)) errors.push('Missing animations object.');
  else for (const [name, clip] of Object.entries(metadata.animations)) validateClip(name, clip as AnimationClipData, metadata.spriteSheet as SpriteSheetConfig, errors);
  return errors;
}

export function parseMetadata(text: string): AnimationMetadataV1 {
  const value: unknown = JSON.parse(text);
  const migrated = migrateMetadata(value);
  const errors = validateMetadata(migrated);
  if (errors.length) throw new Error(errors.join('\n'));
  return migrated;
}

export function validateProject(project: unknown): string[] {
  if (!isObject(project)) return ['Project must be a JSON object.'];
  const errors: string[] = [];
  if (project.projectVersion !== 1) errors.push('Unsupported project version. Expected projectVersion 1.');
  try { parseMetadata(JSON.stringify(project.metadata)); } catch (error) { errors.push(...String(error instanceof Error ? error.message : error).split('\n')); }
  if (!isObject(project.editor)) errors.push('Missing editor state.');
  return errors;
}

export function parseProject(text: string): SpriteProjectV1 {
  const value: unknown = JSON.parse(text);
  const errors = validateProject(value);
  if (errors.length) throw new Error(errors.join('\n'));
  const project = value as unknown as SpriteProjectV1;
  project.metadata = parseMetadata(JSON.stringify((value as Record<string, unknown>).metadata));
  return project;
}

export function normalizedMetadata(metadata: AnimationMetadataV1, imageWidth?: number, imageHeight?: number): AnimationMetadataV1 {
  const copy = structuredClone(metadata);
  if (imageWidth && imageHeight) {
    const sheet = copy.spriteSheet;
    sheet.frameWidth = Number(((imageWidth - sheet.margin.x * 2 - sheet.spacing.x * (sheet.columns - 1)) / sheet.columns).toFixed(4));
    sheet.frameHeight = Number(((imageHeight - sheet.margin.y * 2 - sheet.spacing.y * (sheet.rows - 1)) / sheet.rows).toFixed(4));
  }
  return copy;
}

function migrateMetadata(value: unknown): AnimationMetadataV1 {
  if (!isObject(value)) return value as AnimationMetadataV1;
  if (value.version === 2) return structuredClone(value) as AnimationMetadataV1;
  if (value.version !== 1 || !isObject(value.spriteSheet) || !isObject(value.animations)) return value as AnimationMetadataV1;
  const legacy = value as unknown as LegacyMetadataV1, columns = Number(legacy.spriteSheet.columns) || 1;
  const animations: Record<string, AnimationClipData> = {};
  for (const [name, clip] of Object.entries(legacy.animations)) {
    const row = Number.isInteger(clip.row) ? clip.row : 0, toGlobal = (frame: number) => row * columns + frame;
    animations[name] = {
      frames: (clip.frames ?? []).map(toGlobal),
      fps: clip.fps,
      frameDurations: remapRecord(clip.frameDurations ?? {}, toGlobal),
      playback: structuredClone(clip.playback),
      transform: structuredClone(clip.transform),
      frameOffsets: remapRecord(clip.frameOffsets ?? {}, toGlobal),
      events: (clip.events ?? []).map((event) => ({ ...structuredClone(event), frame: toGlobal(event.frame) })),
      collision: {
        ...(clip.collision?.defaultBodyBox ? { defaultBodyBox: structuredClone(clip.collision.defaultBodyBox) } : {}),
        frames: remapRecord(clip.collision?.frames ?? {}, toGlobal)
      }
    };
  }
  return { version: 2, spriteSheet: structuredClone(legacy.spriteSheet), animations };
}

function remapRecord<T>(record: Record<string, T>, map: (frame: number) => number): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) { const frame = Number(key); if (Number.isInteger(frame)) result[String(map(frame))] = structuredClone(value); }
  return result;
}

function validateSheet(sheet: SpriteSheetConfig, errors: string[]): void {
  if (!positiveInt(sheet.rows)) errors.push('spriteSheet.rows must be a positive integer.');
  if (!positiveInt(sheet.columns)) errors.push('spriteSheet.columns must be a positive integer.');
  if (!vecNonNegative(sheet.margin)) errors.push('spriteSheet.margin must contain non-negative x/y.');
  if (!vecNonNegative(sheet.spacing)) errors.push('spriteSheet.spacing must contain non-negative x/y.');
  if (!isObject(sheet.transparency)) errors.push('spriteSheet.transparency is required.');
  else {
    if (!['nativeAlpha', 'chromaKey', 'none'].includes(sheet.transparency.mode)) errors.push('Invalid transparency mode.');
    if (typeof sheet.transparency.color !== 'string') errors.push('Transparency color must be a string.');
    if (!finiteNumber(sheet.transparency.tolerance) || sheet.transparency.tolerance < 0) errors.push('Transparency tolerance must be >= 0.');
  }
}

function validateClip(name: string, clip: AnimationClipData, sheet: SpriteSheetConfig, errors: string[]): void {
  const p = `animations.${name}`, frameCount = sheet.rows * sheet.columns;
  if (!isObject(clip)) { errors.push(`${p} must be an object.`); return; }
  if (!Array.isArray(clip.frames) || !clip.frames.length) errors.push(`${p}.frames must contain at least one frame.`);
  else if (clip.frames.some((f) => !Number.isInteger(f) || f < 0 || f >= frameCount)) errors.push(`${p}.frames contains an invalid global frame index.`);
  if (!finiteNumber(clip.fps) || clip.fps <= 0) errors.push(`${p}.fps must be > 0.`);
  if (!isObject(clip.playback)) errors.push(`${p}.playback is required.`);
  else {
    if (!finiteNumber(clip.playback.speed) || clip.playback.speed <= 0) errors.push(`${p}.playback.speed must be > 0.`);
    if (!['once', 'loop', 'pingPong'].includes(clip.playback.loopMode)) errors.push(`${p}.playback.loopMode is invalid.`);
    if (!Number.isInteger(clip.playback.loopCount) || clip.playback.loopCount < -1) errors.push(`${p}.playback.loopCount must be -1 or >= 0.`);
  }
  if (!isObject(clip.transform)) errors.push(`${p}.transform is required.`);
  if (!Array.isArray(clip.events)) errors.push(`${p}.events must be an array.`);
  else clip.events.forEach((event, i) => {
    if (!Number.isInteger(event.frame) || event.frame < 0 || event.frame >= frameCount) errors.push(`${p}.events[${i}].frame is invalid.`);
    if (typeof event.name !== 'string' || !event.name.trim()) errors.push(`${p}.events[${i}].name is required.`);
  });
  if (!isObject(clip.collision)) errors.push(`${p}.collision is required.`);
  else {
    if (clip.collision.defaultBodyBox) validateBox(`${p}.collision.defaultBodyBox`, clip.collision.defaultBodyBox, errors);
    for (const [frame, data] of Object.entries(clip.collision.frames ?? {})) {
      if (!validFrameKey(frame, frameCount)) errors.push(`${p}.collision.frames.${frame} is outside the sprite sheet.`);
      validateFrameCollision(`${p}.collision.frames.${frame}`, data, errors);
    }
  }
  for (const [frame, duration] of Object.entries(clip.frameDurations ?? {})) if (!validFrameKey(frame, frameCount) || !finiteNumber(duration) || duration <= 0) errors.push(`${p}.frameDurations.${frame} must reference a valid frame and be > 0.`);
  for (const [frame, offset] of Object.entries(clip.frameOffsets ?? {})) if (!validFrameKey(frame, frameCount) || !vecFinite(offset)) errors.push(`${p}.frameOffsets.${frame} must reference a valid frame and contain finite x/y.`);
}

function validateFrameCollision(path: string, data: FrameCollisionData, errors: string[]): void { if (!isObject(data)) { errors.push(`${path} must be an object.`); return; } for (const [kind, boxes] of [['bodyBoxes', data.bodyBoxes], ['hurtboxes', data.hurtboxes], ['hitboxes', data.hitboxes]] as const) if (boxes) boxes.forEach((box, i) => validateBox(`${path}.${kind}[${i}]`, box, errors)); }
function validateBox(path: string, box: CollisionBox, errors: string[]): void { if (![box.x, box.y, box.width, box.height].every(finiteNumber) || box.width < 0 || box.height < 0) errors.push(`${path} must contain finite x/y and non-negative width/height.`); }
function validFrameKey(value: string, frameCount: number): boolean { const frame = Number(value); return Number.isInteger(frame) && frame >= 0 && frame < frameCount; }
function isObject(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function finiteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function positiveInt(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
function vecNonNegative(value: unknown): boolean { return isObject(value) && finiteNumber(value.x) && finiteNumber(value.y) && value.x >= 0 && value.y >= 0; }
function vecFinite(value: unknown): value is Vec2 { return isObject(value) && finiteNumber(value.x) && finiteNumber(value.y); }
