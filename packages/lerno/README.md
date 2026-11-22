# Lerno

**A framework-agnostic engine for educational content.** Declarative content types, a deterministic
session runtime, a grading layer, and K-12 STEM kernels. Framework-free and renderer-free.

[![license](https://img.shields.io/npm/l/@medu/lerno)](./LICENSE)
[![types](https://img.shields.io/badge/types-included-blue)](./src/index.ts)

Lerno knows nothing about your application stack: no database, no realtime transport, no object
storage, no xAPI, no LLM. Everything of that kind arrives from the outside through `LernoHost`
adapters and `LernoExtension` packages, so the core stays small and testable.

---

## Layers

| Layer | Contents |
| --- | --- |
| **Content model** | `LernoDocument` + zod schemas (`slide`, `question`, `media`, `branch`, `info`, `cards`, `hotspot`, `custom`) |
| **Runtime** | `createSession`: flow, answering, scoring, progress; `Timeline` |
| **Grading** | `defineQuestion` + built-in graders, misconception tags |
| **Extension system** | `LernoRegistry` (node, question, flow, component) + `LernoHost` adapters |
| **Discipline kernels** | `FunctionPlotter` (`function-graph`), `ProjectileSimulation`, `Molecule2D`, `CoordinatePlane`, `CalculusEngine` |
| **Low-level engine** | scene graph (`scenery`), observables (`axon`), geometry (`kite`, `dot`), animation (`twixt`), simulation loop (`sim`) |

---

## Install

No package is on npm yet. Build it from the repository root with `bun run build:packages`, then use
the workspace package. `zod` is the only runtime dependency. Requires Node 20 or newer.

## Quick start

```ts
import { createSession, defineDocument } from '@medu/lerno';

const document = defineDocument({
  id: 'lesson-1',
  type: 'lesson',
  metadata: { title: 'Quadratic Functions' },
  nodes: [
    { id: 's1', type: 'slide', blocks: [{ type: 'text', markdown: 'Hello' }] },
    {
      id: 'q1',
      type: 'question',
      item: {
        kind: 'multiple-choice',
        prompt: 'For f(x) = x², what is f(2)?',
        choices: [
          { id: 'a', label: '2' },
          { id: 'b', label: '4' },
        ],
        correct: ['b'],
      },
    },
  ],
});

const session = createSession(document);
session.next(); // 'q1'
session.answer('q1', { selected: ['b'] }); // { status: 'correct', score: 1, maxScore: 1 }
session.score(); // { earned: 1, max: 1, ratio: 1, passed: null }
```

`session.getState()` returns a plain serializable snapshot; pass it back as
`createSession(document, { state })` to resume where the learner left off.

## Entry points

| Import | Brings in |
| --- | --- |
| `@medu/lerno` | Everything below |
| `@medu/lerno/core` | Scene graph, observables, geometry, animation, sim loop; no zod, no content schema |
| `@medu/lerno/session` | `createSession` and the session state contract |
| `@medu/lerno/content` | Document schema, presets, migrations |
| `@medu/lerno/grading` | Question definitions and graders |
| `@medu/lerno/extensions` | `LernoRegistry`, `LernoHost`, `createLerno` |

Reach for `core` when a surface only draws and animates; reach for the package root when it also
loads documents or grades answers.

## Extensions

```ts
import { createLerno, defineExtension } from '@medu/lerno';

const extension = defineExtension({
  name: 'my-extension',
  setup(registry) {
    registry.addNode({ type: 'flashcard', label: 'Card' });
    registry.addComponent({ type: 'ui.switch', version: 1 });
    registry.addFlow('always-first', (document) => document.nodes[0]?.id ?? null);
  },
});

const { registry, host } = createLerno({ extensions: [extension] });
```

The core recognizes only the types registered on the registry, so new node kinds, question kinds and
flow resolvers ship as separate packages instead of changes to the core.

## Determinism

Two host adapters make a run reproducible: `host.clock()` and `host.random()`. Provide your own and
the same document answers with the same state, which is what recording, replaying and headless
rendering rely on.

```ts
const { host } = createLerno({
  host: { clock: () => frameIndex * 16.6, random: () => 0.5 },
});
```

## Development

```bash
bun install
bun run test        # 28 suites, 159 tests
bun run type-check  # strict, no `any`
bun run build       # CJS + ESM + declarations into dist/
```

## Roadmap

No package is on npm yet. The React player, the Three renderer, motion presets, and the export
adapters live in separate packages of the same repository and are built locally.

## License

[MIT](./LICENSE) © Lerno contributors
