---
'eslint-plugin-node-security': patch
'eslint-plugin-import-next': patch
---

fix(rules): two documented-contract violations found by the burgee FP/FN sweep

- `node-security/no-arbitrary-file-access` now reports whole-value `process.argv`
  and `process.env` paths. `detect-non-literal-fs-filename`'s docs hand this shape
  here by name ("that is `no-arbitrary-file-access`'s question, not this rule's"),
  and neither rule was reporting it, so a documented handoff landed nowhere.

- `import-next/no-cycle` gains a `verbatimModuleSyntax` option (default `false`).
  Under that TypeScript flag an inline `import { type Foo }` is emitted as
  `import {} from './foo.js'` rather than erased, so the target module is still
  evaluated and the cycle is real. The rule skipped those edges on the stated
  premise that `verbatimModuleSyntax` projects write statement-level `import type`;
  TS1484's own quick-fix offers the inline form instead.
