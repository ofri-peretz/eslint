# no-barrel-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Disallow imports from barrel files to improve build performance and tree-shaking

## Rule Details

Importing a barrel file loads every module it re-exports. This rule reports
a runtime load of a module you declare as a barrel in `knownBarrels`
(regular expressions over the specifier), by any spelling: `import`,
side-effect imports, `export { a } from`, `export * from`, `require()`,
`import()` and TS `import x = require()`.

Not reported:

- type-only imports and re-exports (`import type`, an import whose every
  specifier is an inline `type`, `export type ... from`): erased at compile
  time, they load nothing;
- a package matched by `ignoredPackages` (regular expressions);
- with `ignoreNodeModules: true` (the default), a package specifier that
  `knownBarrels` does not name.

A specifier spelled with `/index` (`./components/index`) is also reported,
whatever that file contains.

```ts
// { knownBarrels: ['components$'] }

// ❌ Incorrect
import { Button } from './components';
export * from './components';

// ✅ Correct
import { Button } from './components/Button';
import type { ButtonProps } from './components';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "knownBarrels": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Regex patterns for paths known to be barrels"
      },
      "ignoreNodeModules": {
        "type": "boolean",
        "default": true,
        "description": "Ignore imports from node_modules"
      },
      "ignoredPackages": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Packages to ignore (good tree-shaking support)"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-barrel-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-barrel-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
