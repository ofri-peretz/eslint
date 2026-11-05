# no-default-export

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prevents default exports

## Rule Details

A convention: modules publish named exports only, so every import names what it takes and renames are explicit. This rule reports anything that gives the module a default export:

- `export default ...` (a value, a function, a class, an interface);
- `export { x as default }`, also with the string name `"default"`;
- `export { default } from 'm'` and `export { x as default } from 'm'`;
- `export * as default from 'm'`;
- TS `export = x`.

Re-exporting another module's default under a name (`export { default as Widget } from './widget'`) is exactly the named export the convention asks for, and is not reported. `export * from 'm'` does not re-export a default.

### ❌ Incorrect

```ts
export default function load() {}
const value = 1;
export { value as default };
export { default } from './widget';
```

### ✅ Correct

```ts
export function load() {}
export { default as Widget } from './widget';
export * from './utils';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowInFiles": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Allow default exports in specific files."
      },
      "allowPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Allow default exports for specific patterns."
      },
      "suggestNamed": {
        "type": "boolean",
        "default": true,
        "description": "Suggest named export alternative."
      }
    },
    "additionalProperties": false
  }
]
```

- `allowInFiles` (default `[]`): file globs (or path substrings) where a default export is accepted, e.g. `["**/pages/**"]` for a framework that requires one.
- `allowPatterns` (default `[]`): more file globs (or path substrings), same meaning as `allowInFiles`.
- `suggestNamed` (default `true`): include a named-export equivalent in the message.

A glob matches any run of whole path segments, so `src/pages/**` matches an absolute filename.

## When Not To Use It

When your framework or tooling requires default exports throughout.
