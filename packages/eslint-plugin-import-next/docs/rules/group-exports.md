# group-exports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Prefer named exports to be grouped together in a single export declaration

## Rule Details

Export lists scattered across a file make its public surface hard to see. This rule reports a second export list where one statement would do:

- two local lists, `export { a }; export { b };`
- two re-export lists from the same module, `export { a } from './m'; export { b } from './m';`

Type-only lists group separately from value lists: `export { a }` next to `export type { T }` is not reported, since merging them takes inline `type` modifiers, a style choice this rule does not make. Two type-only lists are reported.

Inline declaration exports (`export const x = 1`), `export default`, `export * from` and re-exports from different modules are not lists to merge. CommonJS `module.exports` assignments are not checked.

### ❌ Incorrect

```ts
export { a };
export { b };

export { c } from './m';
export { d } from './m';

export type { T };
export type { U };
```

### ✅ Correct

```ts
export { a, b };
export { c, d } from './m';
export type { T, U };

export { e };
export type { V };
```

## Options

```json
[]
```

No options.

## When Not To Use It

When you prefer each export statement next to the code it exports.
