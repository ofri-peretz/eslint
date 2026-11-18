# enforce-node-protocol-usage

🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce either using, or omitting, the `node:` protocol when importing Node.js builtin modules

## Rule Details

`eslint-plugin-import`'s rule of the same name, with its option. A codebase picks one spelling for Node.js builtins, and the rule holds every module load to it: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`. The fix adds or removes the scheme.

- `'always'`: a builtin written without the `node:` scheme is reported (`fs`, `fs/promises`).
- `'never'`: a builtin written with the scheme is reported (`node:fs`), but only when the bare name is itself a builtin. `node:test` exists only with the scheme, and `test` would load the npm package, so it is left alone.

A specifier is a builtin when Node's own builtin module list names it exactly. Not reported: packages, relative paths, `punycode/` (Node's documented way to load the npm package instead of the builtin), and a template literal, which `eslint-plugin-import` does not read either. The `import/node-version` setting is honoured as `eslint-plugin-import` honours it for the scheme: below 14.18 (where `require('node:fs')` does not load), `'always'` reports nothing. Which builtins exist is the list of the Node.js running ESLint.

For a one-way rule with no option, see [`prefer-node-protocol`](./prefer-node-protocol.md).

### ❌ Incorrect

```ts
// ['always']
import fs from 'fs';
const { readFile } = require('fs/promises');

// ['never']
import path from 'node:path';
```

### ✅ Correct

```ts
// ['always']
import fs from 'node:fs';
import punycode from 'punycode/';

// ['never']
import path from 'path';
import test from 'node:test';
```

## Options

```json
[
  {
    "type": "string",
    "enum": ["always", "never"]
  }
]
```

`eslint-plugin-import` requires the mode; here it defaults to `'always'`.

## When Not To Use It

When some builtins are imported each way on purpose, or when another tool already decides the spelling.
