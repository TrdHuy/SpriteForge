import { AnimationPlayer } from '../AnimationPlayer';
import type { AnimationMetadataV1 } from '../types';
import type { SceneAnimationEvent, SceneDataV1, SceneInstanceData } from './SceneTypes';

type SceneEventListener = (event: SceneAnimationEvent) => void;
interface RuntimeEntry { instance: SceneInstanceData; player: AnimationPlayer; started: boolean; listenerAttached: boolean; }

export class ScenePlayer {
  private runtimes = new Map<string, RuntimeEntry>();
  private listeners = new Set<SceneEventListener>();
  private playing = false;
  private speed = 1;
  private timeMs = 0;
  constructor(private scene: SceneDataV1, private bundleMetadata: Map<string, AnimationMetadataV1>) { this.rebuildRuntimes(); }
  get isPlaying(): boolean { return this.playing; }
  get sceneTimeMs(): number { return this.timeMs; }
  setPlaybackSpeed(value: number): void { this.speed = Number.isFinite(value) ? Math.max(0.01, value) : 1; }
  replaceScene(scene: SceneDataV1, bundleMetadata: Map<string, AnimationMetadataV1>): void { const wasPlaying = this.playing; this.scene = scene; this.bundleMetadata = bundleMetadata; this.timeMs = 0; this.rebuildRuntimes(); this.playing = wasPlaying; }
  play(): void { this.playing = true; for (const runtime of this.runtimes.values()) if (runtime.started) runtime.player.play(false); }
  pause(): void { this.playing = false; for (const runtime of this.runtimes.values()) runtime.player.pause(); }
  stop(): void { this.playing = false; this.resetRuntimes(); }
  restart(): void { this.resetRuntimes(); this.playing = true; }
  onEvent(listener: SceneEventListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  update(deltaMs: number): void {
    if (!this.playing || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const scaledDelta = Math.min(deltaMs, 10000) * this.speed, previousSceneTime = this.timeMs; this.timeMs += scaledDelta;
    for (const runtime of this.runtimes.values()) {
      const instance = runtime.instance; if (!instance.playback.autoPlay) continue;
      const delay = Math.max(0, instance.playback.startDelay), activeBefore = Math.max(0, previousSceneTime - delay), activeAfter = Math.max(0, this.timeMs - delay), activeDelta = activeAfter - activeBefore;
      if (activeAfter <= 0) continue; if (!runtime.started) this.startRuntime(runtime); if (activeDelta > 0) runtime.player.update(activeDelta * Math.max(0.01, instance.playback.speed));
    }
  }
  currentFrame(instanceId: string): number | null { return this.runtimes.get(instanceId)?.player.currentFrame ?? null; }
  currentSequenceIndex(instanceId: string): number | null { return this.runtimes.get(instanceId)?.player.currentSequenceIndex ?? null; }
  private resetRuntimes(): void { this.timeMs = 0; this.rebuildRuntimes(); }
  private rebuildRuntimes(): void {
    this.runtimes.clear();
    for (const instance of this.scene.instances) { const clip = this.bundleMetadata.get(instance.bundleId)?.animations[instance.clip]; if (!clip) continue; this.runtimes.set(instance.id, { instance, player: new AnimationPlayer(clip), started: false, listenerAttached: false }); }
  }
  private startRuntime(runtime: RuntimeEntry): void {
    runtime.player.play(true); const offset = Math.max(0, runtime.instance.playback.timeOffset); if (offset > 0) runtime.player.update(offset * Math.max(0.01, runtime.instance.playback.speed)); runtime.started = true; this.attachListener(runtime);
  }
  private attachListener(runtime: RuntimeEntry): void {
    if (runtime.listenerAttached) return; runtime.listenerAttached = true;
    runtime.player.onEvent((event) => { const payload: SceneAnimationEvent = { time: this.timeMs, instanceId: runtime.instance.id, instanceName: runtime.instance.name, bundleId: runtime.instance.bundleId, clip: runtime.instance.clip, event }; for (const listener of this.listeners) listener(payload); });
  }
}
