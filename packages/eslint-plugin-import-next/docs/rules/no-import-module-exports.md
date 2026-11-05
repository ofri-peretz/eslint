# no-import-module-exports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid import statements with CommonJS module.exports

## Rule Details

A file that runs `import` declarations and also exports through CommonJS mixes two module systems: bundlers treat it as an ES module, where `module.exports` does not exist, and the exports silently disappear. This rule reports the CommonJS exports of such a file. It needs both:

- a value `import ... from 'm'`. A type-only `import type` is erased at compile time and mixes nothing; a dynamic `import()` is legal in CommonJS.
- a use of the global `module` / `exports`: assigning `module.exports` (dotted or computed) or one of its properties, reading `module.exports`, or assigning a property of `exports`.

A `module` / `exports` bound in the file (a wrapper's parameters) is not the CommonJS global.

### ❌ Incorrect

```ts
import dep from './dep';
module.exports = { run: dep };
```

### ✅ Correct

```ts
import dep from './dep';
export const run = dep;

import type { Dep } from './dep';
module.exports = { run: (d: Dep) => d };
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "exceptions": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "additionalProperties": false
  }
]
```

- `exceptions` (default `[]`): file globs (or path substrings) where mixing is accepted, e.g. `["**/scripts/**"]`. A glob matches any run of whole path segments.

## When Not To Use It

When a build step you control transpiles these files to CommonJS and the mix is intended.
