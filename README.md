# Lerno

**A framework-agnostic engine for educational content.** Declarative content types, a deterministic
session runtime, a grading layer, and K-12 STEM kernels. No framework, no renderer, no database.

Lerno knows nothing about your application stack. Storage, telemetry, media, realtime, xAPI, and LLM
integration arrive from the outside through `LernoHost` adapters and extension packages, so the core
stays small and testable.

## Packages

| Package | Contents |
| --- | --- |
| `@medu/lerno` | Content model, session runtime, grading, discipline kernels, low-level 2D engine |
| `@medu/lerno-react` | `Display`, hooks, `LernoPlayer`, and interactive STEM labs |
| `@medu/lerno-three` | Three.js scene, variable management, bindings |
| `@medu/lerno-motion` | Spring, keyframes, sequence, stagger |
| `@medu/lerno-export` | Headless MP4 export: frames, canvas rasterizer, ffmpeg encoder |

The documentation lives in a separate repository: [trymedu/lerno-docs](https://github.com/trymedu/lerno-docs).

## Requirements

- Node 20 or newer
- Bun 1.3 or newer

## From source

The packages are not on npm yet; the repository builds them locally.

```bash
bun install
bun run build:packages
```

Verification:

```bash
bun run type-check
bun run test
bun run build
```

## Usage

```ts
import { createSession, defineDocument } from '@medu/lerno';
```

`zod` is the only runtime dependency of the core. React components need `react` and
`@heroui/react`; the 3D package needs `three`.

## Repository layout

```
packages/lerno           core engine
packages/lerno-react     React layer
packages/lerno-three     Three.js extension
packages/lerno-motion    animation extension
packages/lerno-export    MP4 export
```

## License

[MIT](./LICENSE) © Lerno contributors
