# consistent-type-specifier-style

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce or ban the use of inline type-only markers for named imports

## Rule Details

TypeScript lets a type-only import be written two ways: a top-level `import type { A } from 'm'`, or an inline qualifier on the specifier, `import { type A } from 'm'`. This rule enforces the one your project chose.

- `prefer-inline` reports a top-level `import type { ... }` that has named specifiers; the fix moves `type` onto each specifier. A type-only default or namespace import (`import type D from 'm'`, `import type * as N from 'm'`) has no inline form and is not reported.
- `prefer-top-level` (default, as in `eslint-plugin-import`: with no options the rule behaves as this) reports every inline `type` qualifier, also one next to value specifiers or a default binding (`import { type A, b } from 'm'`): the type names belong in their own `import type` statement. The fix rewrites a block whose specifiers are all types; a mixed block is reported without a fix, since rewriting it in place would turn its values into types.

Export statements are not checked.

### ❌ Incorrect

```ts
// prefer-inline
import type { User, Role } from './models';

// prefer-top-level (default)
import { type User, type Role } from './models';
import { type User, loadUser } from './models';
```

### ✅ Correct

```ts
// prefer-inline
import { type User, type Role } from './models';
import type Config from './config';

// prefer-top-level (default)
import type { User, Role } from './models';
import { loadUser } from './models';
```

## Options

```json
[
  {
    "type": "string",
    "enum": [
      "prefer-inline",
      "prefer-top-level"
    ]
  }
]
```

A single string, `prefer-inline` or `prefer-top-level` (default).

The default matches `eslint-plugin-import`, whose code treats an absent option as `prefer-top-level` even though its schema advertises `prefer-inline`. To enforce inline specifiers, pass `'prefer-inline'` explicitly. Note that the `strict` and `typescript` presets pair this rule with `no-cycle`, whose graph reads a top-level `import type` as erased, so they pass `'prefer-top-level'` on purpose.

## When Not To Use It

When your codebase mixes both styles on purpose, for example because `verbatimModuleSyntax` makes `import { type A }` keep a side-effect import of the module while `import type` erases it, and you rely on that difference.
