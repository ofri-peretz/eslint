# no-mutable-exports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid the use of mutable exports with `var` or `let`

## Rule Details

An exported `let` or `var` is a live binding: every importer sees the exporting module's later reassignments, which makes the value's history hard to follow. This rule reports a module-level `let` / `var` that the module exports by name:

- inline, also destructured (`export let { a } = obj`);
- through an export list, also renamed (`export { count as total }`);
- as the default through a list (`export { count as default }`), which exports the binding.

Not reported: `const`, functions and classes; `export default count`, which exports the value at that moment, not the binding; a re-export from another module; an imported binding re-exported.

### ❌ Incorrect

```ts
export let count = 0;
var total = 0;
export { total };
```

### ✅ Correct

```ts
export const count = 0;
let total = 0;
export default total;
export function increment() {}
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
        "description": "File patterns where mutable exports are allowed"
      },
      "ignoreExports": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Specific export names to ignore"
      }
    },
    "additionalProperties": false
  }
]
```

- `allowInFiles` (default `[]`): file globs (or path substrings) where mutable exports are accepted. A glob matches any run of whole path segments, so `**/state/*.ts` matches an absolute filename.
- `ignoreExports` (default `[]`): exported names to skip; the name the module publishes (`total` in `export { count as total }`).

## When Not To Use It

When a module intentionally exposes live bindings, e.g. a state module read by other modules.
