# no-duplicates

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Reports duplicate imports

## Rule Details

Two import statements of the same module in one scope are reported when they could be one statement, or one of them adds nothing: two value imports (named, default, inline `type`, side-effect, namespace) of one module, or two `import type` statements of one module.

The same module is the file the resolver sees, so `./m` and `./m.js` (for `m.ts`) and `./m/index` are one module, while `./m?raw` is a different module to a bundler.

Not reported:

- `import type` beside a value import of the same module: the type-only form is erased, and folding it into the value import changes what is emitted.
- A namespace import beside a named import (`import * as ns` and `import { a }`): `import * as ns, { a }` is not valid syntax, so the two cannot be one statement and neither is redundant.
- Imports in two different `declare module 'x' {}` blocks: they belong to two ambient modules.

### ❌ Incorrect

```ts
import { a } from './m';
import { b } from './m';

import './m';
import { c } from './m.js';

import type { A } from './types';
import type { B } from './types';
```

### ✅ Correct

```ts
import { a, b } from './m';
import type { A } from './m';
import * as ns from './m';
import raw from './m?raw';
```

### Reports

Each duplicate is reported once, on the later statement, with a fix that
merges it into the first: a module imported in three statements gets two
reports. eslint-plugin-import reports every statement of the group, the first
included (three reports), so a count of its findings is one higher per
duplicated module. The verdict is the same.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "considerQueryString": {
        "type": "boolean",
        "description": "Whether a query string names a different module. Absent or true: it does. false: the query is ignored."
      },
      "prefer-inline": {
        "type": "boolean",
        "description": "`import type` beside a value import of the same module is a duplicate, merged as an inline `type` specifier."
      }
    },
    "additionalProperties": false
  }
]
```

### eslint-plugin-import options

A config carried over from `import/no-duplicates` loads, and its options mean
what they meant there:

- `prefer-inline: true`: `import type { T }` beside a value import of the
  same module is a duplicate. The fix merges it as an inline `type`
  specifier (`import { v, type T }`), so nothing new is emitted; a value
  import is not merged into an `import type` statement (reported, no fix).
  `false` or absent: the two stay separate, as described above.
- `considerQueryString`: `false` ignores a query string, so `./m?raw`,
  `./m?url` and `./m` are one module (eslint-plugin-import's default). `true`
  or absent is this rule's own reading: the query names a different module,
  while its path part is still resolved (`./m?raw` and `./m.ts?raw` are one).

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-duplicates.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-duplicates.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
