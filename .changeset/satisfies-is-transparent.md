---
'eslint-plugin-secure-coding': patch
---

fix: `no-improper-sanitization` reported through a `satisfies` wrapper.

The `ArrayExpression` fix in the previous release shipped with a unit test using
a bare array, which passed — while the file that produced the finding still
reported twice, because its payload carries `satisfies Block[]`. The climb that
decides whether a literal is developer-authored stopped at the TypeScript
wrapper, so the literal fell back to a check that asks only whether it contains
a dangerous character, and an apostrophe in `"You don't have permission to
write to this resource"` reported again.

`satisfies`, `as`, `!` and angle-bracket assertions are now transparent in both
the climb and the safety test. Markup underneath a wrapper still reports.

`no-unsafe-deserialization` treated `x.eval(…)` on any receiver as a JavaScript
code-execution sink. `client.eval(luaScript, 1, key, …)` is Redis EVAL — Lua,
on the server, compiling nothing here — and it was the only finding in all of
animir/node-rate-limiter-flexible. The Identifier branch already restricted
`eval` and `Function` to globals; the member branch now does too. A member
`deserialize` is still dangerous on any receiver.
