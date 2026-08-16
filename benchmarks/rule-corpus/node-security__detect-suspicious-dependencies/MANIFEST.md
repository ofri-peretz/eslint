# Rule corpus — `node-security/detect-suspicious-dependencies` (CWE-506)

Written from CWE-506 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is **module loading**: `import`, `export … from`, `require`,
`await import()`, `import x = require()`. The vulnerability is a package whose
NAME is one slip of the fingers from a package the developer meant to install,
so the malicious code arrives through the ordinary dependency path and its
`postinstall` hook runs before any test or review does.

## Fixtures

### `vulnerable/` — 15

Wave 1 — the loader forms a typosquat actually arrives through:

| File | Shape |
|---|---|
| `01-require-typosquat-lodash.js` | `require('loadsh')` in a build script — the real documented npm squat |
| `02-import-default-typosquat-react.js` | `import raect from 'raect'` — transposition |
| `03-dynamic-import-typosquat-express.js` | `await import('expres')` in a lazy server bootstrap |
| `04-namespace-import-typosquat-axios.js` | `import * as axois from 'axois'` on an HTTP client |
| `05-destructured-import-typosquat-webpack.js` | `import { webpack } from 'wepback'` |
| `06-aliased-import-typosquat-react.js` | `import { useState as useLocalState } from 'reactt'` |
| `07-import-equals-typosquat.ts` | `import lodahs = require('lodahs')` (TypeScript) |
| `08-postinstall-typosquat.js` | `require('expresss')` from a postinstall hook |

Wave 2 — adversarial, written after wave 1 scored 100%:

| File | Attack |
|---|---|
| `09-const-alias-specifier.js` | the name reaches `require` through one `const` |
| `10-export-from-typosquat.js` | `export { x } from 'axois'` — a barrel file |
| `11-export-star-typosquat.js` | `export * from 'wepback'` |
| `12-ts-cast-specifier.ts` | `require('loadsh' as string)` and a typed `const` |
| `13-create-require-typosquat.js` | `module.createRequire()` — callee is never spelled `require` |
| `14-subpath-of-typosquat.js` | `import fp from 'loadsh/fp'` — a sub-path entry point |
| `15-type-only-import-typosquat.ts` | `import type … from 'axois'` — erased, but still installed |

### `safe/` — 10

| File | Shape |
|---|---|
| `01-genuine-dependencies.js` | the five reference packages, spelled correctly |
| `02-preact-legitimate.js` | `preact` — one edit from `react`, a real dependency |
| `03-scoped-packages.js` | `@nestjs/common` etc — a scope is owned by its org |
| `04-node-builtins.js` | `node:fs` and bare `crypto` |
| `05-relative-local-modules.js` | `./loadsh` — a local file, not a registry name |
| `06-adjacent-legitimate-packages.js` | `lodash-es`, `axios-retry`, `redux`, `recast` |
| `07-subpath-and-deep-imports.js` | `lodash/debounce.js`, `react/jsx-runtime` |
| `08-vocabulary-only-in-text.js` | squat names only in a comment, a log line and a blocklist array |
| `09-local-binding-wearing-package-name.js` | local `const loadsh` / `function raect` |
| `10-reactn-real-package.js` | `reactn` — a real npm package one edit from `react` |

## Scores

| Wave | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1 only (8 vuln / 7 safe) | 8 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| + adversarial wave, before fix | 9 | 1 | 6 | 90.0% | 60.0% | **72.0%** |
| after fix | 15 | 1 | 0 | 93.8% | 100.0% | **96.8%** |

## What this corpus proved

**Four false negatives, all fixed** (`src/rules/detect-suspicious-dependencies/index.ts`):

1. **Sub-path entry points.** The edit distance was computed against the WHOLE
   specifier, so `loadsh/fp` — which installs the package `loadsh` — scored far
   past the threshold, and `lodash/debounce.js` was inflated the same way. One
   line was wrong about a squat and about an ordinary deep import
   simultaneously. Fixed by comparing the package-name portion.
2. **Re-exports.** `ExportNamedDeclaration` and `ExportAllDeclaration` had no
   visitor at all, so a barrel file — the place a modern codebase writes
   dependency names most often — was invisible.
3. **Expression specifiers.** `arg.type === 'Literal'` was required at the call
   site, so `const PKG = 'loadsh'; require(PKG)` and `require('loadsh' as
   string)` both vanished. Hoisting a dependency name to a module constant is
   ordinary style, not obfuscation. Fixed with `unwrapTypeSyntax` +
   `resolveConstantString` (one `const` hop, through scope analysis).
4. **`module.createRequire`.** The sanctioned way an ESM file loads CommonJS,
   and therefore the spelling a modern codebase actually uses. The callee is
   never literally `require`. Fixed by resolving the binding with
   `resolveModuleBinding` — never by matching the local variable's name.

**One false positive, NOT fixed — reported instead.** `safe/10` imports
`reactn`, a real published package one edit from `react`. It is not on the
rule's hand-maintained `KNOWN_LEGITIMATE` list, so the rule accuses a genuine
dependency of being malware — the exact mistake the rule's own comment calls
"far more costly than missing a squat".

This is not fixable by adding `reactn` to the list, because the list is a
vocabulary and the registry keeps publishing names it has never heard of.
Worse, measurement shows the list barely does anything: of its nine entries,
**eight are dead** — their minimum edit distance to any of the five reference
packages is already 2 or more, so they could never have been reported:

| entry | min distance | effect |
|---|---:|---|
| `preact` | 1 | LIVE — actually suppresses |
| `recast` | 2 | dead |
| `reactor` | 2 | dead |
| `redux` | 3 | dead |
| `lodash-es` | 3 | dead |
| `expressive` | 3 | dead |
| `webpack-cli` | 4 | dead |
| `react-dom` | 4 | dead |
| `axios-retry` | 6 | dead |

The allowlist documents a fear it does not address. The architectural fix is a
real signal — registry age, download count, publish date, a maintained squat
feed — not a longer list of names.

**A second, unfixed recall limit.** `popularPackages` holds five names, so the
entire documented 2017–2018 npm typosquat wave (`crossenv`, `mongose`,
`babelcli`, `jquery.js`, `ffmepg`, `nodecaffe`, …) is out of range: not one is
within one edit of react/lodash/express/axios/webpack. The rule detects squats
of five packages, which is what its measured recall is a recall OF.
