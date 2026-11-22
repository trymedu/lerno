# @medu/lerno-three

Three.js extension for Lerno: 3D scenes, variable management, and bindings between the reactive model
and Three.js objects.

## Install

```bash
bun add @medu/lerno @medu/lerno-three three react
```

`three` and `react` are peer dependencies; the Three.js version is chosen by the consumer.

## Rendering is browser-only

`ThreeRuntime.mount()` creates a `WebGLRenderer` and needs a DOM canvas. Outside a browser it throws
`THREE_HEADLESS_ERROR`, and `render()` throws when the runtime is not mounted. `@medu/lerno-export`
records Lerno 2D node trees only; a Three.js scene is rejected. Render the 3D layer in a browser or a
WebGL backend and composite the result with `exportMp4({ video })`.

## Usage

```tsx
import { useThreeScene } from '@medu/lerno-three';
```

See the documentation for scene, variable, and binding examples.

## License

MIT
