# export

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid any invalid exports, i.e. re-export of the same name

## Rule Details

A module may export each name once per declaration space, and has one default export. The rule reports a second export of a name that TypeScript rejects as a duplicate, and a second default export. It decides by the kind of each export, the way TypeScript's declaration-merging table does:

- A value (`const`/`let`/`var`, a destructured binding, a function, `export { v }`, a re-export, `export * as ns`) and a pure type (`interface`, `type`) live in different spaces, so `export type Twilio` beside `export const Twilio` is legal.
- Declarations that merge are legal: `interface` + `interface`, `class` + `interface`, `enum` + `enum` (when at most one of them omits its first member's initializer), and a `namespace` beside a function, class, enum, interface, type alias or namespace.
- A namespace that holds only types (interfaces, type aliases, `const enum`s, namespaces of the same kind) declares no value, so it merges with any export of the name except `export * as N`. `export const Status = …` beside `export namespace Status { export type Code = … }` is legal.
- Every other pair is a duplicate, including a class or enum beside a type alias of the same name (both occupy the type space too) and an export specifier beside any value: `export type { T as N }` is an alias, and TypeScript rejects it beside `export const N`.
- `export default`, `export { v as default }` and `export { default } from './m'` are each a default export. `export * from` never re-exports a default.

Names inside `export namespace A {}` are scoped to `A`. Not reported: a re-export beside a pure type of the same name (legal when the re-exported binding is a value, which this file cannot see), and collisions between `export * from` modules (they need the other modules).

### ❌ Incorrect

```ts
export const N = 1;
export function N() {}

const o = { a: 1 };
export const { a } = o;
export const a = 2;

export class Shape {}
export type Shape = { kind: string };

export default 1;
export { value as default };
```

### ✅ Correct

```ts
export type Twilio = ITwilio;
export const Twilio = ITwilio;

export interface Options {
  a: string;
}
export interface Options {
  b: number;
}

export function build() {}
export namespace build {
  export const version = 1;
}

export enum Color {
  Red = 0,
}
export enum Color {
  Blue = 1,
}
```

## Options

```json
[]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/export.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/export.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
