---
'eslint-plugin-import-next': patch
---

fix(import-next): `consistent-type-specifier-style` no longer deletes a default import

Under `prefer-top-level`, `import yargs, { type Argv } from 'yargs'` was fixed
to `import type { Argv } from 'yargs'` — dropping the default binding and
leaving `TS2304: Cannot find name 'yargs'` behind a clean lint run.

The report is gated on the named specifiers alone, all of which are inline
types, so the preference genuinely applies; the fixer then rebuilt the statement
from those same named specifiers, and a default binding is not among them.
Nothing reported afterwards, so `--fix` left a broken file and said nothing.

The report stays. The rewrite is withheld when the declaration carries a binding
the rebuild would not carry over. (Upstream emits two statements instead; that
is the fuller fix and a larger change than this defect needs.)
