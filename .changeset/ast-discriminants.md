---
'eslint-plugin-node-security': patch
---

fix: `no-timing-unsafe-compare` reported AST discriminant comparisons.

```js
statement.expression.operatorToken.kind === SyntaxKind.EqualsToken
```

flint-fyi/flint, `packages/ts/src/rules/errorSubclassProperties.ts:56` — a
TypeScript AST comparison inside their own lint rule, reported because the
identifier carries `token`.

`kind`, `type`, `flag`, `category` and their plurals join the non-secret tails.
A discriminant an enum assigns is never a value an attacker guesses a byte at a
time, and only the last word of the identifier is tested, so `tokenKind` is
excluded while `kindToken` still reports.
