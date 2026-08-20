import type { AnimationClipData, AnimationMetadataV1, CollisionBox, SpriteProjectV1, SpriteSheetConfig } from '../core/types';

export function createDefaultMetadata(image = ''): AnimationMetadataV1 {
  return {
    version: 1,
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
  if (metadata.version !== 1) errors.push('Unsupported metadata version. Expected version 1.');
  if (!isObject(metadata.spriteSheet)) errors.push('Missing spriteSheet object.');
  else validateSheet(metadata.spriteSheet as unknown as SpriteSheetConfig, errors);
  if (!isObject(metadata.animations)) errors.push('Missing animations object.');
  else for (const [name, clip] of Object.entries(metadata.animations)) validateClip(name, clip as AnimationClipData, metadata.spriteSheet as SpriteSheetConfig, errors);
  return errors;
}

export function parseMetadata(text: string): AnimationMetadataV1 {
  const value: unknown = JSON.parse(text);
  const errors = validateMetadata(value);
  if (errors.length) throw new Error(errors.join('\n'));
  return value as AnimationMetadataV1;
}

export function validateProject(project: unknown): string[] {
  if (!isObject(project)) return ['Project must be a JSON object.'];
  const errors: string[] = [];
  if (project.projectVersion !== 1) errors.push('Unsupported project version. Expected projectVersion 1.');
  errors.push(...validateMetadata(project.metadata));
  if (!isObject(project.editor)) errors.push('Missing editor state.');
  return errors;
}

export function parseProject(text: string): SpriteProjectV1 {
  const value: unknown = JSON.parse(text);
  const errors = validateProject(value);
  if (errors.length) throw new Error(errors.join('\n'));
  return value as SpriteProjectV1;
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
  const p = `animations.${name}`;
  if (!isObject(clip)) { errors.push(`${p} must be an object.`); return; }
  if (!Number.isInteger(clip.row) || clip.row < 0 || clip.row >= sheet.rows) errors.push(`${p}.row is outside the sprite sheet.`);
  if (!Array.isArray(clip.frames) || !clip.frames.length) errors.push(`${p}.frames must contain at least one frame.`);
  else if (clip.frames.some((f) => !Number.isInteger(f) || f < 0 || f >= sheet.columns)) errors.push(`${p}.frames contains an invalid column index.`);
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
    if (!Number.isInteger(event.frame) || event.frame < 0 || event.frame >= sheet.columns) errors.push(`${p}.events[${i}].frame is invalid.`);
    if (typeof event.name !== 'string' || !event.name.trim()) errors.push(`${p}.events[${i}].name is required.`);
  });
  if (!isObject(clip.collision)) errors.push(`${p}.collision is required.`);
  else if (clip.collision.defaultBodyBox) validateBox(`${p}.collision.defaultBodyBox`, clip.collision.defaultBodyBox, errors);
  for (const [frame, duration] of Object.entries(clip.frameDurations ?? {})) if (!Number.isInteger(Number(frame)) || !finiteNumber(duration) || duration <= 0) errors.push(`${p}.frameDurations.${frame} must be > 0.`);
}

function validateBox(path: string, box: CollisionBox, errors: string[]): void {
  if (![box.x, box.y, box.width, box.height].every(finiteNumber) || box.width < 0 || box.height < 0) errors.push(`${path} must contain finite x/y and non-negative width/height.`);
}

function isObject(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function finiteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function positiveInt(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
function vecNonNegative(value: unknown): boolean { return isObject(value) && finiteNumber(value.x) && finiteNumber(value.y) && value.x >= 0 && value.y >= 0; }
