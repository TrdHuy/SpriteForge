import type { AnimationMetadataV1 } from '../core/types';
import type { SceneDataV1, SceneInstanceData } from '../core/scene/SceneTypes';

export function validateSceneData(value: unknown): string[] {
  const errors: string[] = []; if (!isObject(value)) return ['Scene must be a JSON object.']; if (value.version !== 1) errors.push('Unsupported scene version. Expected version 1.');
  if (!isObject(value.viewport)) errors.push('Missing viewport object.'); else { const viewport = value.viewport; if (!positive(viewport.width)) errors.push('viewport.width must be > 0.'); if (!positive(viewport.height)) errors.push('viewport.height must be > 0.'); if (typeof viewport.backgroundColor !== 'string') errors.push('viewport.backgroundColor must be a string.'); if (!finite(viewport.groundY)) errors.push('viewport.groundY must be a finite number.'); }
  if (!isObject(value.bundles)) errors.push('bundles must be an object.'); else for (const [id, reference] of Object.entries(value.bundles)) { if (!id.trim()) errors.push('Bundle ids cannot be empty.'); if (!isObject(reference) || typeof reference.image !== 'string' || typeof reference.metadata !== 'string') errors.push(`bundles.${id} must contain image and metadata file names.`); }
  if (!Array.isArray(value.instances)) errors.push('instances must be an array.'); else { const ids = new Set<string>(); value.instances.forEach((instance, index) => validateInstance(instance, index, ids, errors)); }
  return errors;
}
export function validateSceneDependencies(scene: SceneDataV1, bundles: Map<string, AnimationMetadataV1>): string[] { const errors: string[] = []; for (const instance of scene.instances) { const metadata = bundles.get(instance.bundleId); if (!metadata) errors.push(`${instance.name}: bundle '${instance.bundleId}' is not loaded.`); else if (!metadata.animations[instance.clip]) errors.push(`${instance.name}: clip '${instance.clip}' does not exist in bundle '${instance.bundleId}'.`); } return errors; }
export function parseSceneData(text: string): SceneDataV1 { const value: unknown = JSON.parse(text), errors = validateSceneData(value); if (errors.length) throw new Error(errors.join('\n')); return value as SceneDataV1; }
export function serializeSceneData(scene: SceneDataV1): string { const errors = validateSceneData(scene); if (errors.length) throw new Error(errors.join('\n')); return JSON.stringify(scene, null, 2); }
function validateInstance(value: unknown, index: number, ids: Set<string>, errors: string[]): void {
  const path = `instances[${index}]`; if (!isObject(value)) { errors.push(`${path} must be an object.`); return; } const instance = value as unknown as SceneInstanceData;
  if (typeof instance.id !== 'string' || !instance.id.trim()) errors.push(`${path}.id is required.`); else if (ids.has(instance.id)) errors.push(`${path}.id '${instance.id}' is duplicated.`); else ids.add(instance.id);
  if (typeof instance.name !== 'string' || !instance.name.trim()) errors.push(`${path}.name is required.`); if (typeof instance.bundleId !== 'string' || !instance.bundleId.trim()) errors.push(`${path}.bundleId is required.`); if (typeof instance.clip !== 'string' || !instance.clip.trim()) errors.push(`${path}.clip is required.`);
  if (!isObject(instance.transform)) errors.push(`${path}.transform is required.`); else { const t = instance.transform; if (![t.x,t.y,t.scaleX,t.scaleY,t.rotation].every(finite)) errors.push(`${path}.transform contains invalid numeric values.`); if (t.scaleX === 0 || t.scaleY === 0) errors.push(`${path}.transform scale cannot be zero.`); }
  if (!Number.isInteger(instance.zIndex)) errors.push(`${path}.zIndex must be an integer.`); if (typeof instance.visible !== 'boolean') errors.push(`${path}.visible must be boolean.`);
  if (!isObject(instance.playback)) errors.push(`${path}.playback is required.`); else { if (!finite(instance.playback.startDelay) || instance.playback.startDelay < 0) errors.push(`${path}.playback.startDelay must be >= 0.`); if (!finite(instance.playback.timeOffset) || instance.playback.timeOffset < 0) errors.push(`${path}.playback.timeOffset must be >= 0.`); if (!positive(instance.playback.speed)) errors.push(`${path}.playback.speed must be > 0.`); if (typeof instance.playback.autoPlay !== 'boolean') errors.push(`${path}.playback.autoPlay must be boolean.`); }
}
function isObject(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function positive(value: unknown): value is number { return finite(value) && value > 0; }
