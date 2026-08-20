import { describe, expect, it, vi } from 'vitest';
import { AnimationPlayer } from '../src/core/AnimationPlayer';
import { createDefaultClip } from '../src/core/AnimationClip';
import { SpriteSheet } from '../src/core/SpriteSheet';
import { createDefaultMetadata, parseMetadata, validateMetadata } from '../src/io/metadata';

describe('SpriteSheet', () => {
  it('calculates frame rectangles with margin and spacing', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.spriteSheet.rows = 4;
    metadata.spriteSheet.columns = 8;
    metadata.spriteSheet.margin = { x: 8, y: 6 };
    metadata.spriteSheet.spacing = { x: 2, y: 4 };
    const sheet = new SpriteSheet(1536, 1152, metadata.spriteSheet);
    expect(sheet.frameWidth).toBe((1536 - 16 - 14) / 8);
    expect(sheet.frameHeight).toBe((1152 - 12 - 12) / 4);
    expect(sheet.getFrameRect(1, 2).x).toBeCloseTo(8 + 2 * (sheet.frameWidth + 2));
    expect(sheet.getFrameRect(1, 2).y).toBeCloseTo(6 + sheet.frameHeight + 4);
  });
});

describe('AnimationPlayer', () => {
  it('loops according to FPS', () => {
    const clip = createDefaultClip(0, 3);
    clip.fps = 10;
    const player = new AnimationPlayer(clip);
    player.play(true);
    player.update(100);
    expect(player.currentFrame).toBe(1);
    player.update(200);
    expect(player.currentFrame).toBe(0);
  });

  it('uses per-frame duration overrides', () => {
    const clip = createDefaultClip(0, 2);
    clip.fps = 10;
    clip.frameDurations['0'] = 250;
    const player = new AnimationPlayer(clip);
    player.play(true);
    player.update(200);
    expect(player.currentFrame).toBe(0);
    player.update(50);
    expect(player.currentFrame).toBe(1);
  });

  it('supports ping-pong playback', () => {
    const clip = createDefaultClip(0, 3);
    clip.fps = 10;
    clip.playback.loopMode = 'pingPong';
    const player = new AnimationPlayer(clip);
    player.play(true);
    player.update(100);
    expect(player.currentFrame).toBe(1);
    player.update(100);
    expect(player.currentFrame).toBe(2);
    player.update(100);
    expect(player.currentFrame).toBe(1);
  });

  it('emits configured frame events on entry', () => {
    const clip = createDefaultClip(0, 2);
    clip.fps = 10;
    clip.events.push({ frame: 1, name: 'deal_damage' });
    const listener = vi.fn();
    const player = new AnimationPlayer(clip);
    player.onEvent(listener);
    player.play(true);
    player.update(100);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].name).toBe('deal_damage');
  });
});

describe('metadata', () => {
  it('round-trips valid v1 metadata', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.animations.walk = createDefaultClip(0, 8);
    expect(validateMetadata(metadata)).toEqual([]);
    expect(parseMetadata(JSON.stringify(metadata))).toEqual(metadata);
  });

  it('rejects frame indexes outside configured columns', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.spriteSheet.columns = 4;
    metadata.animations.bad = createDefaultClip(0, 4);
    metadata.animations.bad.frames = [0, 4];
    expect(validateMetadata(metadata).some((e) => e.includes('invalid column index'))).toBe(true);
  });
});
