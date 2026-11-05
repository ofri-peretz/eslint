# no-namespace

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid namespace (a.k.a. "wildcard" *) imports

## Rule Details

A convention: modules are imported by name, so every import shows what it takes and bundlers can drop what is unused. This rule reports a namespace import, `import * as ns from 'm'`, also `import type * as ns from 'm'` and `import d, * as ns from 'm'`, unless an `ignore` glob matches the module specifier.

Named and default imports are fine, and so is the re-export `export * as ns from 'm'` (not an import).

### ❌ Incorrect

```ts
import * as utils from './utils';
import type * as Models from './models';
```

### ✅ Correct

```ts
import { format, parse } from './utils';
import type { User } from './models';
export * as utils from './utils';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "ignore": {
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

- `ignore` (default `[]`): globs matched against the module specifier; `*` matches any run of characters. E.g. `["*.css", "lodash"]` keeps `import * as styles from './styles.css'`.

## When Not To Use It

When namespace imports are your convention, or a library is designed to be used through one.
