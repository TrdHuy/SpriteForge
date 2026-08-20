import type { AnimationClipData, AnimationEventData } from './types';

type EventListener = (event: AnimationEventData) => void;

export class AnimationPlayer {
  private clip: AnimationClipData;
  private sequenceIndex = 0;
  private direction = 1;
  private accumulator = 0;
  private loopsCompleted = 0;
  private listeners = new Set<EventListener>();
  private playing = false;

  constructor(clip: AnimationClipData) { this.clip = clip; }
  setClip(clip: AnimationClipData, reset = true): void { this.clip = clip; if (reset) this.reset(); }
  get isPlaying(): boolean { return this.playing; }
  get currentSequenceIndex(): number { return this.sequenceIndex; }
  get currentFrame(): number { return this.clip.frames[this.sequenceIndex] ?? 0; }
  play(reset = false): void {
    if (reset) this.reset();
    if (!this.clip.frames.length) return;
    if (this.clip.playback.randomStart && reset) this.sequenceIndex = Math.floor(Math.random() * this.clip.frames.length);
    this.playing = true;
  }
  pause(): void { this.playing = false; }
  stop(): void { this.playing = false; this.reset(); }
  reset(): void { this.sequenceIndex = 0; this.direction = 1; this.accumulator = 0; this.loopsCompleted = 0; }
  seek(index: number): void { this.sequenceIndex = Math.max(0, Math.min(this.clip.frames.length - 1, index)); this.accumulator = 0; }
  onEvent(listener: EventListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  update(deltaMs: number): void {
    if (!this.playing || this.clip.frames.length <= 1 || deltaMs <= 0) return;
    this.accumulator += Math.min(deltaMs, 10000) * Math.max(0.001, this.clip.playback.speed);
    let safety = 0;
    while (safety++ < 1000) {
      const duration = this.clip.frameDurations[String(this.currentFrame)] ?? 1000 / Math.max(0.001, this.clip.fps);
      if (this.accumulator < duration) break;
      this.accumulator -= duration;
      if (!this.advance()) break;
    }
  }
  stepForward(): void { this.advance(); }
  stepBackward(): void { if (!this.clip.frames.length) return; this.sequenceIndex = (this.sequenceIndex - 1 + this.clip.frames.length) % this.clip.frames.length; this.emit(); }
  private advance(): boolean {
    const length = this.clip.frames.length;
    if (!length) return false;
    if (this.clip.playback.loopMode === 'pingPong') {
      this.sequenceIndex += this.direction;
      if (this.sequenceIndex >= length || this.sequenceIndex < 0) {
        this.loopsCompleted += 1;
        if (this.reachedLimit()) { this.sequenceIndex = this.direction > 0 ? length - 1 : 0; this.playing = false; return false; }
        this.direction *= -1;
        this.sequenceIndex += this.direction * 2;
        this.sequenceIndex = Math.max(0, Math.min(length - 1, this.sequenceIndex));
      }
    } else {
      this.sequenceIndex += 1;
      if (this.sequenceIndex >= length) {
        this.loopsCompleted += 1;
        if (this.clip.playback.loopMode === 'once' || this.reachedLimit()) { this.sequenceIndex = length - 1; this.playing = false; return false; }
        this.sequenceIndex = 0;
      }
    }
    this.emit();
    return true;
  }
  private reachedLimit(): boolean { return this.clip.playback.loopCount >= 0 && this.loopsCompleted >= this.clip.playback.loopCount; }
  private emit(): void { for (const event of this.clip.events) if (event.frame === this.currentFrame) for (const listener of this.listeners) listener(event); }
}
