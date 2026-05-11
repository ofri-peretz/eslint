# `tools/eslint-rules/` — Repo-Local ESLint Rules

Custom ESLint rules used to lint *this repo's own code*. Not published to npm — internal-only conventions enforced by the workspace `eslint.config.mjs`.

## Rules

| Rule | What it enforces |
| :--- | :--- |
| [`changelog-format.js`](./changelog-format.js) | Per-package CHANGELOG entries follow the conventional-commits format used by the release workflow |
| [`require-vitest-watch-false.js`](./require-vitest-watch-false.js) | Vitest configs disable watch mode by default (CI runs would otherwise hang) |

## Adding a rule

1. Create the rule file in this directory.
2. Export it from [`index.js`](./index.js).
3. Reference it from the root [`../../eslint.config.mjs`](../../eslint.config.mjs) `plugins` block.
4. Add a row to the table above.

These rules are intentionally repo-scoped. Anything generally useful belongs in one of the published `packages/eslint-plugin-*` packages instead — see [`../../docs/QUALITY_STANDARDS.md`](../../docs/QUALITY_STANDARDS.md) §1 for the placement decision.
