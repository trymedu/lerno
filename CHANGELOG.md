# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-14

First public release.

### Added

- Content model: `LernoDocument`, zod schemas for `slide`, `question`, `media`, `branch`, `info`,
  `cards`, `hotspot` and `custom` nodes, plus presets and schema migrations.
- Deterministic runtime: `createSession` with flows, answering, scoring, progress, variables and a
  serializable state snapshot that can be resumed.
- Grading: `defineQuestion`, built-in graders for multiple choice, numeric, equation, solution steps,
  concept maps and custom graders, with misconception tags.
- Extension system: `LernoRegistry` (nodes, questions, flows, components), `LernoHost` adapters
  (storage, telemetry, media, realtime, clock, random) and `createLerno` / `defineExtension`.
- Discipline kernels: `FunctionPlotter`, `ProjectileSimulation`, `Molecule2D`, `CoordinatePlane`,
  `CalculusEngine`.
- Low-level engine: scene graph, observable properties, 2D geometry, tweening and the simulation loop,
  reachable without the content layer through `@medu/lerno/core`.
- Dual build: CommonJS, ES modules and type declarations, with per-layer entry points.
