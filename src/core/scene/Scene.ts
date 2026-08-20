import type { AnimationBundleReference } from '../bundle/AnimationBundle';
import type { SceneDataV1, SceneInstanceData } from './SceneTypes';

export function createDefaultScene(): SceneDataV1 {
  return { version: 1, viewport: { width: 1280, height: 720, backgroundColor: '#171c24', groundY: 620 }, bundles: {}, instances: [] };
}

export class Scene {
  readonly data: SceneDataV1;
  constructor(data: SceneDataV1 = createDefaultScene()) { this.data = data; }
  setBundleReference(bundleId: string, reference: AnimationBundleReference): void { this.data.bundles[bundleId] = { ...reference }; }
  addInstance(bundleId: string, clip: string, x?: number, y?: number): SceneInstanceData {
    const ordinal = this.data.instances.filter((instance) => instance.bundleId === bundleId).length + 1;
    const instance: SceneInstanceData = {
      id: this.uniqueId(`${bundleId}-${ordinal}`), name: `${humanize(bundleId)} #${ordinal}`, bundleId, clip,
      transform: { x: x ?? this.data.viewport.width / 2, y: y ?? this.data.viewport.groundY, scaleX: 1, scaleY: 1, rotation: 0, flipX: false, flipY: false },
      zIndex: 10, visible: true, playback: { startDelay: 0, timeOffset: 0, speed: 1, autoPlay: true }
    };
    this.data.instances.push(instance); return instance;
  }
  getInstance(id: string): SceneInstanceData | undefined { return this.data.instances.find((instance) => instance.id === id); }
  removeInstance(id: string): void { const index = this.data.instances.findIndex((instance) => instance.id === id); if (index >= 0) this.data.instances.splice(index, 1); }
  duplicateInstance(id: string): SceneInstanceData | null {
    const source = this.getInstance(id); if (!source) return null; const copy = structuredClone(source);
    copy.id = this.uniqueId(`${source.id}-copy`); copy.name = `${source.name} copy`; copy.transform.x += 24; copy.transform.y += 24; this.data.instances.push(copy); return copy;
  }
  clear(): void { this.data.instances.length = 0; }
  private uniqueId(seed: string): string { let candidate = seed, suffix = 2; const used = new Set(this.data.instances.map((instance) => instance.id)); while (used.has(candidate)) candidate = `${seed}-${suffix++}`; return candidate; }
}
function humanize(value: string): string { return value.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Instance'; }
