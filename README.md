# SpriteForge

SpriteForge is a browser-based 2D sprite animation studio and scene composition previewer.

## Animation Bundle

SpriteForge calls one sprite image plus one runtime metadata file an **Animation Bundle**:

```text
monster.png
monster.animation.json
```

The PNG contains the sprite sheet. The JSON describes grid geometry, animation clips, timing, transforms, collision boxes, and frame events.

## Animation Editor

The existing Animation Editor supports sprite-sheet loading, grid overlays, multiple clips, arbitrary frame sequences, FPS/per-frame duration, loop modes, anchor/offset stabilization, flip/scale, frame events, collision boxes, metadata import/export, and project persistence.

## Scene Preview

Use the top mode switcher and choose **Scene Preview**. It supports:

- Loading multiple PNG + `.animation.json` pairs in one selection.
- Automatic bundle pairing through `spriteSheet.image`.
- Multiple scene instances from one Animation Bundle.
- Per-instance clip, position, scale, rotation, flip, visibility, and z-index.
- Shared scene playback clock with Play All, Pause, Stop, Restart, and global speed.
- Per-instance start delay, time offset, speed, and auto-play.
- Dragging instances on the scene canvas.
- Ground, anchor, frame-bound, collision, and instance-name overlays.
- Scene timing overview and animation event log.
- Versioned `.scene.json` import/export.

Scene files reference bundles instead of embedding image bytes.

## Architecture

```text
src/
├── core/
│   ├── AnimationPlayer.ts
│   ├── SpriteSheet.ts
│   ├── bundle/AnimationBundle.ts
│   └── scene/
│       ├── Scene.ts
│       ├── ScenePlayer.ts
│       └── SceneTypes.ts
├── editor/
│   ├── Renderer.ts
│   └── scene/
│       ├── SceneController.ts
│       └── SceneRenderer.ts
├── io/
│   ├── metadata.ts
│   ├── BundleLoader.ts
│   └── sceneMetadata.ts
├── app-shell.ts
├── main.ts
└── scene-main.ts
```

`AnimationPlayer` still owns exactly one clip. `ScenePlayer` only orchestrates multiple independent players on a shared clock. Scene transforms never mutate Animation Bundle metadata.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

GitHub Pages is built from the Vite `dist` directory through GitHub Actions.
