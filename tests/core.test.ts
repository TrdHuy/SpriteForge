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

  it('maps global frame indexes across row boundaries', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.spriteSheet.rows = 2;
    metadata.spriteSheet.columns = 4;
    const sheet = new SpriteSheet(400, 200, metadata.spriteSheet);
    expect(sheet.frameCount).toBe(8);
    expect(sheet.getFrameRectByIndex(3)).toEqual(sheet.getFrameRect(0, 3));
    expect(sheet.getFrameRectByIndex(4)).toEqual(sheet.getFrameRect(1, 0));
    expect(sheet.getFrameRectByIndex(7)).toEqual(sheet.getFrameRect(1, 3));
  });
});

describe('AnimationPlayer', () => {
  it('loops according to FPS', () => {
    const clip = createDefaultClip(3);
    clip.fps = 10;
    const player = new AnimationPlayer(clip);
    player.play(true);
    player.update(100);
    expect(player.currentFrame).toBe(1);
    player.update(200);
    expect(player.currentFrame).toBe(0);
  });

  it('plays one clip across multiple sprite rows', () => {
    const clip = createDefaultClip(8);
    clip.fps = 10;
    const player = new AnimationPlayer(clip);
    player.play(true);
    player.update(300);
    expect(player.currentFrame).toBe(3);
    player.update(100);
    expect(player.currentFrame).toBe(4);
    player.update(300);
    expect(player.currentFrame).toBe(7);
  });

  it('uses per-frame duration overrides', () => {
    const clip = createDefaultClip(2);
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
    const clip = createDefaultClip(3);
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
    const clip = createDefaultClip(2);
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
  it('round-trips valid v2 metadata', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.animations.walk = createDefaultClip(32);
    expect(validateMetadata(metadata)).toEqual([]);
    expect(parseMetadata(JSON.stringify(metadata))).toEqual(metadata);
  });

  it('accepts global frames across rows', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.spriteSheet.rows = 2;
    metadata.spriteSheet.columns = 4;
    metadata.animations.attack = createDefaultClip(8);
    expect(validateMetadata(metadata)).toEqual([]);
  });

  it('rejects frame indexes outside the whole sprite sheet', () => {
    const metadata = createDefaultMetadata('monster.png');
    metadata.spriteSheet.rows = 2;
    metadata.spriteSheet.columns = 4;
    metadata.animations.bad = createDefaultClip(8);
    metadata.animations.bad.frames = [0, 8];
    expect(validateMetadata(metadata).some((e) => e.includes('invalid global frame index'))).toBe(true);
  });

  it('migrates v1 row-local clips to v2 global frame indexes', () => {
    const v1 = {
      version: 1,
      spriteSheet: { image: 'monster.png', rows: 2, columns: 4, margin: { x: 0, y: 0 }, spacing: { x: 0, y: 0 }, transparency: { mode: 'nativeAlpha', color: '#000000', tolerance: 0 } },
      animations: { attack: { row: 1, frames: [0,1,2,3], fps: 8, frameDurations: { '1': 150 }, playback: { speed: 1, loopMode: 'loop', loopCount: -1, randomStart: false }, transform: { anchor: { x: .5, y: 1 }, offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, flipX: false, flipY: false }, frameOffsets: { '2': { x: 1, y: 0 } }, events: [{ frame: 3, name: 'hit' }], collision: { frames: { '0': { hitboxes: [{ x: 0, y: 0, width: 1, height: 1 }] } } } } }
    };
    const migrated = parseMetadata(JSON.stringify(v1));
    expect(migrated.version).toBe(2);
    expect(migrated.animations.attack.frames).toEqual([4,5,6,7]);
    expect(migrated.animations.attack.frameDurations['5']).toBe(150);
    expect(migrated.animations.attack.frameOffsets['6']).toEqual({ x: 1, y: 0 });
    expect(migrated.animations.attack.events[0].frame).toBe(7);
    expect(migrated.animations.attack.collision.frames['4']).toBeDefined();
  });
});
