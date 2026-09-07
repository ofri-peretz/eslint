---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `consistent-function-scoping` sees through a type assertion to module scope

An arrow already at module scope was told to move to module scope when a type operator sat between it and its binding:

```ts
const noExit = (() => undefined) as unknown as (code: number) => never; // reported
```

The walk from the function up to `Program` stepped over the declarator and declaration only, so `as`, `satisfies`, `!` and `<T>` hid the fact that there was nowhere higher to go. A type operator changes what TypeScript believes about a value and nothing about where it lives; all four are now stepped over. The same cast inside a function still reports.
