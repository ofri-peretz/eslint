---
"eslint-plugin-conventions": minor
---

feat(no-magic-numbers): add conventions/no-magic-numbers — closes prob_magic_numbers ILB-Arena-Quality FN

Flags numeric literals that lack a named constant, catching the magic number
code smell that makes intent unclear.

**Built-in allowlist:** `-1, 0, 1, 2` are always allowed as universally idiomatic.

**Context-aware skips (by default):**
- `const` / `export const` declarations — the literal IS the named constant
- Array index access: `items[3]` (`ignoreArrayIndexes: true`)
- Default parameter values: `function f(n = 1000) {}`
- TypeScript enum initializers: `enum Status { Active = 1 }`
- Numeric object property keys: `{ 404: 'Not Found' }`

**Options:** `ignore`, `ignoreArrayIndexes`, `ignoreDefaultValues`, `ignoreEnums`, `ignoreBitwiseExpressions`.

Added at `warn` severity in `conventions/recommended`.
