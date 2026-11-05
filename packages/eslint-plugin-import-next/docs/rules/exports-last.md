# exports-last

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Ensure all exports appear after other statements

## Rule Details

A module whose export statements all sit at the end shows its public surface in one place. This rule reports an export statement (`export { a }`, `export default a`, `export * from 'm'`) that is followed by a statement that is not an export.

An inline declaration export (`export const x = 1`, `export function f() {}`) is exempt by design: it declares and exports in one statement and is written where the declaration belongs. It is not reported, and it does not push the export statements before it down either.

Imports after an export are a matter for `first`, not this rule.

### ❌ Incorrect

```ts
const a = 1;
export { a };
const b = 2;

export default run;
function run() {}
```

### ✅ Correct

```ts
const a = 1;
const b = 2;
export { a, b };

export const c = 3;
const d = 4;
export default d;
```

## Options

```json
[]
```

No options.

## When Not To Use It

When you prefer each export statement next to the code it exports.
