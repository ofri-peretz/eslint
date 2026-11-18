# no-unused-modules

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid modules without exports

## Rule Details

This rule enforces a convention: every module exports something. It reports a module that has no export at all.

An export is any way the module hands a value out: ESM `export` (named, default, `export * from`, a type), TypeScript `export =`, and CommonJS writes to the real `module.exports` or `exports`: `module.exports =`, `module['exports'] =`, `exports.a =`, `module.exports.a =`, and `Object.defineProperty(exports, …)` / `Object.assign(module.exports, …)`. A write to a local or parameter that is merely named `exports` exports nothing. `export {}` exports nothing but is how TypeScript marks a file as a module on purpose, so it is not reported.

`allowImportOnly` exempts a module that imports something (ESM `import`, `require()`, or `import x = require()`) and exports nothing, such as an entry point that wires other modules together.

### ❌ Incorrect

```ts
console.log('nothing leaves this file');

function fill(exports: Record<string, unknown>) {
  exports.a = 1;
}
```

### ✅ Correct

```ts
export const a = 1;
```

```js
module.exports.handler = () => {};
Object.defineProperty(exports, 'version', { value: '1.0.0' });
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowImportOnly": {
        "type": "boolean",
        "default": false,
        "description": "Allow modules that only contain imports."
      },
      "missingExports": {
        "type": "boolean",
        "description": "eslint-plugin-import: true reports a module with no exports, false turns the check off. Absent: on. Its `unusedExports` (cross-file usage) is not implemented and is rejected rather than ignored."
      },
      "src": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "eslint-plugin-import: globs, relative to the cwd; only files matching one are checked"
      },
      "ignoreExports": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "eslint-plugin-import: globs, relative to the cwd; files matching one are not checked"
      }
    },
    "additionalProperties": false
  }
]
```

### eslint-plugin-import options

`missingExports`, `src` and `ignoreExports` load as in `import/no-unused-modules`. This rule's check is `missingExports`: `true` (or absent) runs it, `false` turns it off. `src` limits it to files matching one of its globs, and `ignoreExports` skips files matching one; globs are resolved against ESLint's cwd. `unusedExports` — which export no other file imports — is not implemented, so it is rejected rather than accepted and ignored.

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-unused-modules.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-unused-modules.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
