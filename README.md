# SpriteForge

SpriteForge is a browser-based 2D sprite animation studio designed to be both an authoring tool and a reusable animation-runtime baseline for future games.

## V1 features

- Load PNG/WebP/JPEG sprite sheets locally in the browser.
- Configure rows, columns, margin, spacing, and transparency/chroma key.
- Grid overlay with selected row and current-frame highlighting.
- Multiple named animation clips per sprite sheet.
- Arbitrary frame sequences, FPS, per-frame durations, speed, loop/once/ping-pong, loop count, and random start.
- Play, pause, stop, step, seek, and timeline reordering.
- Anchor, global offset, per-frame offset, scale, flip X/Y, ground line, and frame-bound debug overlays.
- Frame events with optional JSON payloads.
- Body, hurt, and hit collision boxes authored directly on the preview canvas.
- Versioned runtime metadata export/import.
- Editor project export/import and local editor preferences.
- Core playback unit tests.
- Static deployment through GitHub Pages.

## Development

```bash
npm install
npm run dev
```

Run tests and production build:

```bash
npm test
npm run build
```

## Architecture

The animation runtime is deliberately separated from editor code:

```text
src/
├── core/
│   ├── AnimationClip.ts
│   ├── AnimationPlayer.ts
│   ├── SpriteSheet.ts
│   └── types.ts
├── editor/
│   └── Renderer.ts
├── io/
│   └── metadata.ts
└── main.ts
```

`src/core` has no dependency on editor UI. A future game runtime can reuse `SpriteSheet`, `AnimationPlayer`, and the metadata types without shipping the SpriteForge editor.

## Sprite-sheet geometry

For a sheet with dimensions `imageWidth × imageHeight`:

```text
frameWidth  = (imageWidth  - 2*marginX - spacingX*(columns-1)) / columns
frameHeight = (imageHeight - 2*marginY - spacingY*(rows-1)) / rows
```

Animation clips reference a source `row` and a frame sequence containing column indexes.

## Runtime metadata

Runtime export uses a versioned `.animation.json` file. Example:

```json
{
  "version": 1,
  "spriteSheet": {
    "image": "monster.png",
    "rows": 4,
    "columns": 8,
    "margin": { "x": 0, "y": 0 },
    "spacing": { "x": 0, "y": 0 },
    "transparency": {
      "mode": "nativeAlpha",
      "color": "#000000",
      "tolerance": 10
    }
  },
  "animations": {
    "walk_down": {
      "row": 0,
      "frames": [0, 1, 2, 3, 4, 5, 6, 7],
      "fps": 8,
      "frameDurations": {},
      "playback": {
        "speed": 1,
        "loopMode": "loop",
        "loopCount": -1,
        "randomStart": false
      },
      "transform": {
        "anchor": { "x": 0.5, "y": 1 },
        "offset": { "x": 0, "y": 0 },
        "scale": { "x": 1, "y": 1 },
        "flipX": false,
        "flipY": false
      },
      "frameOffsets": {},
      "events": [],
      "collision": { "frames": {} }
    }
  }
}
```

Editor-only state such as preview zoom and debug toggles is not included in runtime metadata; it is stored in `.sprite-project.json` instead.

## Coordinate model

- Frame coordinates use the unscaled sprite-frame coordinate system.
- Anchor is normalized relative to frame width/height; `(0.5, 1.0)` means bottom-center.
- Clip offset and per-frame offset are expressed in frame pixels.
- Collision boxes are authored in frame coordinates, so they remain independent of editor zoom.

## Runtime usage

```ts
import { AnimationPlayer } from './core/AnimationPlayer';

const clip = metadata.animations.walk_down;
const player = new AnimationPlayer(clip);

player.onEvent((event) => {
  if (event.name === 'footstep') {
    // Game decides how to react.
  }
});

player.play(true);
player.update(deltaMs);
```

SpriteForge emits animation events and metadata; game-specific combat, audio, physics, and networking remain outside the editor/runtime core.
