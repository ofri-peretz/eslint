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

## Options

```json
[]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-duplicates.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-duplicates.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
