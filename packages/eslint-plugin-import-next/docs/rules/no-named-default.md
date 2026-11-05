# no-named-default

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid named default exports

## Rule Details

A default export has its own import spelling. Taking it through the named block, `import { default as x } from 'm'`, is a roundabout way to write `import x from 'm'`. This rule reports it however `default` is written (an identifier or the string `'default'`) and also in a type import (`import type x from 'm'` is the equivalent).

A re-export, `export { default as x } from 'm'`, is not an import and is not reported.

### ❌ Incorrect

```ts
import { default as config } from './config';
import { 'default' as config2 } from './config';
import type { default as Config } from './config';
```

### ✅ Correct

```ts
import config from './config';
import type Config from './config';
export { default as config } from './config';
```

## Options

```json
[]
```

No options.

## When Not To Use It

Never needed; the default import spelling always exists.
