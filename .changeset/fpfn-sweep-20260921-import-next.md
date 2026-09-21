---
'eslint-plugin-import-next': patch
'@interlace/eslint-devkit': patch
---

Three fixes, all found by sweeping the plugins over a real NodeNext ESM codebase.

`extensions` no longer strips an extension the module resolver proves is
load-bearing. Under `moduleResolution: NodeNext` its `--fix` turned a clean
`tsc` into 207 `TS2835` errors and `ERR_MODULE_NOT_FOUND` at runtime. The rule
now resolves both spellings and withholds report and fix unless they name the
same file; an extension that is pure decoration is still reported and fixed.

`extensions` also now honours the options it declares. Its `defaultOptions`
(`svg`/`png`/`jpg` set to `always`) never reached the rule, because `create`
did not declare the merged-options parameter the devkit passes — so a stale
local fallback map won and `./logo.svg` was stripped with no configuration at
all. Relatedly, `{ default: 'always' }` was a no-op: `pattern` was taken as a
whole object, so a user who set only `default` got the built-in map. Precedence
is now user `pattern` → user `default` → declared `pattern` → declared
`default`.

`no-cycle` no longer reports a cycle through an inline type-only import. The
dependency graph's type-edge test matched only top-level `import type`, so
`import { type Foo } from './a'` kept its edge while the rule's own report site
correctly treated it as erased — the same edge got two verdicts depending on
which file you linted. An import with any value binding still keeps its edge.
