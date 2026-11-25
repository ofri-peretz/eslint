# no-commonjs

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Prevents CommonJS require/module.exports

## Rule Details

An ES module that uses CommonJS cannot be tree-shaken, is not statically analysable, and breaks when loaded as native ESM. This rule reports CommonJS in an ES module:

- a call to the global `require` (static or dynamic argument), and TS `import x = require('m')`;
- assigning `module.exports` (dotted or computed), or one of its properties;
- assigning a property of the global `exports`.

`__dirname` and `__filename` are not reported: like `eslint-plugin-import`'s rule, this one looks for the CommonJS module system, not for the two path globals. To ban them, use `no-restricted-globals`.

The rule decides by binding. A `require` the file binds itself (a parameter, or `createRequire(import.meta.url)`, the sanctioned ESM way to load CommonJS), and a local `exports` object are the file's own values.

A `.cjs` / `.cts` file, or one the config parses as CommonJS, is CommonJS on purpose and is not checked. `require.resolve()` loads nothing and is not reported.

### ❌ Incorrect

```ts
const util = require('./util');
module.exports = { run };
exports.run = run;
```

### ✅ Correct

```ts
import util from './util';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('./data.json');
export { run };
```

## Options

```json
{
  "anyOf": [
    {
      "type": "array",
      "items": [
        {
          "type": "string",
          "enum": ["allow-primitive-modules"]
        }
      ],
      "additionalItems": false
    },
    {
      "type": "array",
      "items": [
        {
          "type": "object",
          "properties": {
            "allowRequire": {
              "type": "boolean",
              "description": "Allow require() calls (default false)."
            },
            "allowModuleExports": {
              "type": "boolean",
              "description": "Allow module.exports (default false)."
            },
            "allowExports": {
              "type": "boolean",
              "description": "Allow exports.* patterns (default false)."
            },
            "allowInFiles": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Allow CommonJS in specific files."
            },
            "suggestES6": {
              "type": "boolean",
              "description": "Suggest ES6 alternatives (default true)."
            },
            "allowPrimitiveModules": {
              "type": "boolean",
              "description": "eslint-plugin-import: allow `module.exports = value` when the value is not an object literal."
            },
            "allowConditionalRequire": {
              "type": "boolean",
              "description": "eslint-plugin-import: allow require() inside an if, try, logical or conditional expression."
            }
          },
          "additionalProperties": false
        }
      ],
      "additionalItems": false
    }
  ]
}
```

- `allowRequire` (default `false`): accept `require()` and `import x = require()`.
- `allowModuleExports` (default `false`): accept `module.exports` assignments.
- `allowExports` (default `false`): accept `exports.*` assignments.
- `allowInFiles` (default `[]`): file globs (or path substrings) where CommonJS is accepted. A glob matches any run of whole path segments.
- `suggestES6` (default `true`): offer an editor suggestion with the ES module equivalent.

### eslint-plugin-import options

A config carried over from `import/no-commonjs` loads, and its options mean
what they meant there:

- `allowPrimitiveModules` (or the older string form,
  `['allow-primitive-modules']`): accept `module.exports = value` when the
  value is not an object literal (a function, a class, a string).
  `module.exports = {}` and `module.exports.x = …` are still reported.
- `allowConditionalRequire`: accept a `require()` inside an `if`, a `try`, a
  logical (`&&`, `||`, `??`) or a conditional (`?:`) expression.

eslint-plugin-import's default for `allowConditionalRequire` is `true`; it
applies here to a config written its way (the string form, or either option
above). Otherwise this rule's own default, `false`, applies. This rule also
reports a `require()` that eslint-plugin-import leaves alone: inside a
function, with a computed argument, or with more than one argument.

## When Not To Use It

In a CommonJS codebase that has not moved to ES modules.
