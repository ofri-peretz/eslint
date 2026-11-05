# no-empty-named-blocks

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Forbid empty named import blocks

## Rule Details

An empty named block imports or re-exports nothing; it is usually left over after the last specifier was removed. This rule reports:

- `import {} from 'm'` and `import type {} from 'm'`;
- `import a, {} from 'm'` (the fix drops `, {}`);
- `export {} from 'm'` and `export type {} from 'm'`.

The braces are read as tokens, not text: a comment inside them (`import { /* none */ } from 'm'`) leaves them empty, and a `{}` inside a comment is no block. A local `export {}` marks a file as a module and is not reported; a side-effect `import 'm'` has no block.

`import {} from 'm'` and `export {} from 'm'` still load and run `m`, so the autofix keeps that: it rewrites them to `import 'm'`, carrying over any import attributes. Deleting the statement would silently drop a polyfill, a stylesheet or a registration. A type-only statement (`import type {} from 'm'`, `export type {} from 'm'`) loads nothing, and the fix removes it. To delete a value statement entirely, use the "Remove empty import statement" suggestion.

### ❌ Incorrect

```ts
import {} from './setup';
import config from './config';
export {} from './types';
```

### ✅ Correct

```ts
import './setup';
import config from './config';
export {};
```

## Options

```json
[]
```

No options.

## When Not To Use It

Never needed; an empty block has no meaning a side-effect import does not express better.
