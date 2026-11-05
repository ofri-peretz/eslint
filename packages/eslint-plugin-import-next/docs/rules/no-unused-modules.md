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
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-unused-modules.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-unused-modules.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
