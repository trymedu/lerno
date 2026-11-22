# @medu/lerno-export

Headless MP4 export for Lerno: deterministic frame trees, a React-free canvas rasterizer, and an
ffmpeg pipe encoder. Node 20 or newer.

## Install

```bash
bun add @medu/lerno @medu/lerno-export
```

`@napi-rs/canvas` is a peer dependency and provides the 2D raster target.

## 2D only

The exporter records Lerno node trees. A Three.js scene is not a render tree and is rejected with
`THREE_HEADLESS_ERROR`. Render 3D content in a browser or a WebGL backend and composite the result
through `exportMp4({ video })`.

## Usage

```ts
import { exportMp4 } from '@medu/lerno-export';

await exportMp4(scene, {
  out: 'lesson.mp4',
  width: 1280,
  height: 720,
  fps: 30,
  duration: 6,
  fontFamily: 'Inter',
});
```

`exportMp4` probes glyph coverage before encoding; pass `fontFamily` explicitly.

## License

MIT
