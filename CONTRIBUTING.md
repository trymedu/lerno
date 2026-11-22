# Contributing

Thanks for taking the time to contribute. Issues and pull requests are both welcome.

## Before you open a pull request

```bash
bun install
bun run type-check   # must be clean
bun run test         # must be green
bun run build        # must produce dist/
```

## Conventions

- **Strict TypeScript, no `any`.** External or unknown input is typed `unknown` and narrowed with a
  type guard (or a zod schema) before use.
- **Every module ships with a spec.** A new `*.ts` under `src/` needs a matching `*.spec.ts` covering
  the success path and the error/edge paths.
- **The core stays dependency-free.** Runtime dependencies beyond `zod` need a strong justification;
  integrations belong in the host adapters or in a separate extension package.
- **Determinism is not optional.** Anything time- or randomness-dependent reads from `host.clock()`
  and `host.random()`, never `Date.now()` or `Math.random()` directly.
- **Public API changes need docs.** A new export is also a new docs page in
  `apps/lerno-docs/content/docs`.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). Keep the subject in
the imperative mood.

## Releasing

Bumping the version in `package.json` and updating `CHANGELOG.md` is all a maintainer has to do;
`prepack` builds `dist/` and `prepublishOnly` runs the type-check and the test suite before anything
reaches npm.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
