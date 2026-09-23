---
'eslint-plugin-import-next': patch
---

fix: `no-internal-modules` rewrote relative deep imports to the importing file's own directory

For any `./a/b…` specifier the fixer wrote `'.'` — not the target's owner, but the directory of the file doing the importing. On a real file:

```ts
import { Command } from './commander/command.js';
import { Option } from './commander/option.js';
export { Help } from './commander/help.js';
```

`eslint --fix` collapsed three distinct modules to one specifier:

```ts
import { Command } from '.';
import { Option } from '.';
export { Help } from '.';
```

`'.'` resolves to `src/index.ts`, which exports none of those names, so the file no longer compiles — and under `"type": "module"` with NodeNext it does not resolve at all (`ERR_UNSUPPORTED_DIR_IMPORT`), because ESM has no directory-index resolution for relative specifiers. Zero reports remained afterwards, so the breakage was silent. The `suggest` strategy offered the same edit.

The rule was already computing the right answer and discarding it: for the identical violation, `strategy: 'error'` reported `Import from "./commander"`. Both fixing strategies now write that computed path for `./`-rooted specifiers.

`suggestedPath` rather than the immediate barrel, deliberately: `suggestedPath` sits exactly at `maxDepth`, so the rewritten specifier no longer reports and `--fix` converges in one pass. The immediate barrel re-reports on the next pass, and successive `--fix` passes would walk it back down to `'.'` — fixing nothing outside a single-pass `RuleTester`. A new `valid` fixture locks that fixpoint property.

Packages and `../` traversal are untouched: `lodash/get` → `lodash`, `@company/ui/x/Button` → `@company/ui`, `../../a/b` → `../..`.

**Two pre-existing fixtures encoded the defect and were corrected** — both asserted message/fixer _agreement_, a claim that survives intact; they had simply recorded that agreement at the wrong string, copied from the buggy fixer into a mandatory `output:` field. See the commit message for the detail.

Where no safe relative rewrite exists, the fixing strategies now report without an edit. At `maxDepth: 0` every `./x` specifier is out of policy, and a forbid-only `./x` violation (within `maxDepth`, so its suggested path is the root) resolves to the root — in both cases the only in-policy spelling is `'.'`, the same own-directory swap. `autofix` leaves the specifier alone and `suggest` offers nothing, the way a `#` subpath import already degrades. The `error` message still names `"."` at `maxDepth: 0`; `maxDepth: 0` is an unsatisfiable policy for relative specifiers, which is a separate question from this fix.
