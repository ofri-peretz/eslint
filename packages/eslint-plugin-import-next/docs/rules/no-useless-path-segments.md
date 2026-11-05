# no-useless-path-segments

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid unnecessary path segments in import and require statements

## Rule Details

Reports a relative specifier that a shorter relative specifier names the same
module with, and fixes it to the shorter one. Node resolves a relative
specifier against the importing file's directory, so these are the same module
by construction:

- `./lib/./dep`, `./lib/../dep`, `./lib//dep` and `././dep` (lexical
  normalisation);
- a path that leaves the file's directory and comes back into it: from
  `src/app.ts`, `../src/dep` is `./dep` and `./../src/dep` is `./dep`.

With `noUselessIndex: true`, an extensionless trailing `/index` is useless too
(`./lib/index` becomes `./lib`, `./index` becomes `.`), but only when both
paths resolve to the same file. `./both/index` beside a `both.ts` is not
reported: `./both` names `both.ts`. A path that does not resolve proves
nothing and is not reported.

Not reported:

- `./lib/index.js`: a written extension, which ESM / NodeNext requires
  (a directory import does not load there);
- a trailing slash (`./lib/`), which only matches a directory and can name a
  different module than `./lib`;
- package and absolute specifiers.

Every static spelling is checked: `import`, `import type`, side-effect
`import './x'`, `export { a } from`, `export * from` and `import('./x')`.
`require('./x')` and TS `import x = require('./x')` are checked while
`commonjs` is `true` (the default).

```ts
// ❌ Incorrect (in src/app.ts)
import a from './lib/../dep';
export * from '../src/dep';
const b = require('./lib//dep');

// ✅ Correct
import a from './dep';
export * from './dep';
const b = require('./lib/dep');
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "noUselessIndex": {
        "type": "boolean",
        "default": false
      },
      "commonjs": {
        "type": "boolean",
        "default": true
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-useless-path-segments.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-useless-path-segments.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
