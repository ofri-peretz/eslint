---
'eslint-plugin-maintainability': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `error-message`, `no-missing-error-context`, `no-silent-errors`, `no-unhandled-promise`: brought in line with the same rules in `eslint-plugin-reliability`. A local class named `Error` is not the built-in; `new Error(undefined)`, an empty template-literal message and `globalThis.Error()` are reported; a thrown object or a subclass that supplies its own message is not reported for missing context, while a plain class named `*Error` is; a promise started inside `try` without `await` is unhandled.
- `consistent-function-scoping`: capture is decided by the scope manager. A helper's own `const factor` no longer reads as the outer `factor`, and a helper typed with a type the enclosing function declares is not reported (moving it would not compile).
- `cognitive-complexity`: recursion is a call that reaches the function's own binding. A local that shares the function's name no longer counts; an arrow or function expression bound to a `const` calling itself does.
- `no-nested-ternary`: a ternary in the test position, or behind `as` / `satisfies` / `!` / `<T>`, is nesting.
- `max-parameters`: `ignoreConstructors` skips class `constructor`s, and `ignoreOverriddenMethods` (previously ignored) skips members marked `override`.
- `nested-complexity-hotspots`: turning `countConditionals` or `countLoops` off no longer crashes the lint run; `do...while` loops are reported.
- `no-unreadable-iife`: reports only past the documented limits (`maxStatements`, `maxDepth`). A short IIFE holding a single `if` / `try`, a helper or three parameters is not reported; a value-returning IIFE is not held to `maxStatements` under `allowReturningIIFE`; IIFEs invoked through `.call` / `.apply` are checked.
- `identical-functions`: a reformatted copy (different line breaks and comments) matches exactly, also at `similarityThreshold: 1`.
- `no-lonely-if`: `allow` no longer switches the rule off for a file whose text contains a listed string; it has no effect.

Placeholder docs (`max-parameters`, `nested-complexity-hotspots`, `no-unreadable-iife`) now state the contract; the others document their options.
