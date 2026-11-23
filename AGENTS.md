# AGENTS.md

Entry point for a coding agent in this repository. [CLAUDE.md](./CLAUDE.md) holds the working
rules; [ARCHITECTURE.md](./ARCHITECTURE.md) is the map. This file stays short on purpose: a rule
that a machine can check lives in a lint rule, a hook or a gate, whose failure message is its
documentation.

## What this is

An npm + Turborepo + Changesets monorepo (no Nx, no pnpm) of security-focused ESLint plugins,
each shipped with an oxlint alias. `packages/eslint-plugin-*` are the plugins, and each
`package.json` `description` is the canonical one-liner; `packages/eslint-devkit` is the shared
rule toolkit; `apps/docs` is eslint.interlace.tools. Each plugin's own `AGENTS.md` is generated
for consumers (`npm run agents-md`) and is not about working in this repo.

## Commands

```bash
npm run ci:local                              # the pre-push battery; run before ready-for-review
npx turbo run test --filter=...[origin/main]  # affected tests (also build, typecheck)
npm run oxlint && npx eslint .                # fast pass, then the long tail
npm run lint:workflows                        # workflow conventions
npm run changeset                             # every user-visible change needs one
npm run mutation -- --plugin <name>           # oxmutate: which changes no fixture notices
npm run dev --workspace docs                  # docs on :3000 (build @interlace/ui first)
```

## Read before you…

| Task | Read |
| --- | --- |
| write, move or review a rule | [docs/RULE_AUTHORING.md](./docs/RULE_AUTHORING.md) and [docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md) |
| open, wait on or merge a PR; confirm a deploy | the `ship-a-pr` skill; [docs/CI_AND_RELEASE.md](./docs/CI_AND_RELEASE.md) |
| trust a gate, baseline or metric | the `verify-the-instrument` skill |
| release or reconcile versions | `npm run release:status`; [docs/CI_AND_RELEASE.md](./docs/CI_AND_RELEASE.md) |
| preview the docs in a container or sandbox | [docs/LOCAL_PREVIEW.md](./docs/LOCAL_PREVIEW.md) |

## Two rules no gate holds yet

- Plugin scope is decided by the detection gate, not the vulnerability class: a rule that only
  fires when SDK X is installed belongs in X's plugin. `npm run lint:taxonomy` catches the
  mechanical cases; the reasoning is in docs/RULE_AUTHORING.md.
- Report what the code proves, at its normal severity. Never decide by matching string values
  (hostnames, name substrings), never exclude `examples/` or `fixtures/` paths for consumers.
