# no-duplicates

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Reports duplicate imports

## Rule Details

Two import statements of the same module in one scope are reported when they fall in the same one of eslint-plugin-import's four groups:

- value imports: named, default and side-effect imports;
- namespace imports (`import * as ns`), which can only be a duplicate of another namespace import;
- type-only named imports: `import type { T }`, and an import with an inline `type` specifier (`import { type T }`);
- type-only defaults (`import type D`).

With `prefer-inline: true` the type groups join the value ones: a type-only import is a duplicate of a value import of the same module.

The same module is the file the resolver sees, so `./m` and `./m.js` (for `m.ts`) and `./m/index` are one module, while `./m?raw` is a different module to a bundler. It is the file that runs: a package's `exports` are matched without the `types` condition, so `svelte` and `svelte/store`, which share one `types` file, are two modules.

Not reported:

- `import type` beside a value import of the same module: the type-only form is erased, and folding it into the value import changes what is emitted.
- A namespace import beside any other import (`import * as ns` and `import { a }`): `import * as ns, { a }` is not valid syntax.
- An inline `type` import beside a value import (`import { type T }` and `import { a }`), and a type-only default beside a type-only named import.
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

Every statement of a duplicated module is reported, the first included, as
eslint-plugin-import does: a module imported in three statements gets three
reports. The fix rides on the later ones, each merging into the first.
(Before 4.0 only the later statements were reported.)

The message is one line naming the module, and the file it resolves to when
it resolves: `'./m' imported multiple times (src/m.ts).`

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
