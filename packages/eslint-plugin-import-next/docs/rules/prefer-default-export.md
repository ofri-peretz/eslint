# prefer-default-export

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Prefer a default export if module exports a single name

## Rule Details

A convention: a module that publishes a single value should make it the default export. Which modules qualify depends on `target`.

- `single` (default) and `as-needed`: report a module whose exports are exactly one value name and no default.
- `always`: report a module with any value named export and no default.
- `any` (eslint-plugin-import's spelling): as `always`, except that a module
  with an `export * from` is not reported, since it publishes names this file
  cannot see.

Every value name the module publishes counts: inline declarations (also `enum`, and each name a destructuring declares), export lists (also string names), and `export { x } from 'm'` re-exports. A default in any spelling (`export default`, `export { x as default }`, `export { default } from 'm'`, `export * as default from 'm'`) satisfies the rule. `export * from 'm'` publishes names the file cannot see, so the count is unknown and `single` stays silent. A `const enum` does not count. A module that exports a type (`export type`, `export interface`, `export type { T }`, `export { type T }`) is not reported under any target: a type alias cannot be its default export, so the module needs named exports anyway. eslint-plugin-import leaves such a module alone too.

### ❌ Incorrect

```ts
// target: single (default)
export const config = { retries: 3 };

export { api } from './api';
```

### ✅ Correct

```ts
// target: single (default)
const config = { retries: 3 };
export default config;

export const a = 1;
export const b = 2;

export const c = 1;
export * from './more';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "target": {
        "type": "string",
        "enum": ["always", "single", "as-needed", "any"],
        "default": "single",
        "description": "When to enforce default exports: always (any named export and no default), single (exactly one exported name), as-needed (same as single), any (eslint-plugin-import: always, unless the file has an `export * from`)"
      },
      "ignoreFiles": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "File globs (or path substrings) to ignore"
      },
      "allowNamedExports": {
        "type": "boolean",
        "default": false,
        "description": "Allow named exports without warnings"
      }
    },
    "additionalProperties": false
  }
]
```

- `target` (default `single`): `single` or `as-needed` (the same: one exported name), `always`, or `any` (eslint-plugin-import: `always` unless the module has an `export * from`).
- `ignoreFiles` (default `[]`): file globs (or path substrings) to skip. A glob matches any run of whole path segments.
- `allowNamedExports` (default `false`): turn the rule off for every file.

## When Not To Use It

When your codebase prefers named exports (see `no-default-export`).
