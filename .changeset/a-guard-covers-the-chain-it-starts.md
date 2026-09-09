---
'eslint-plugin-reliability': patch
---

fix: `no-missing-null-checks` follows four more guards it already meant to follow

Each of these is a check the rule accepts in one spelling and missed in another.

- **A computed link continues a chain.** `rootGuards` read the relation off the source text — `response` covers `response.data.items` because that text starts with `response.`. An index does not, so a check on `m` did not cover `m[0]`, and `const m = /x/.exec(s); return m ? m[0].length : 0` reported. `chainStartsWith` accepts `.`, `[`, `?.` and `!` as continuations.
- **A ternary guards one arm, and which one depends on the test.** Only the consequent was read, so `winner === undefined ? 'unset' : winner.value` reported the arm that can only run when `winner` is present.
- **Short-circuit `&&` covers its whole right operand.** The walk took one fixed step up from the access, which found `m && m[1]` and missed `m && hasAnyFlag(m[1] as string)` — the same guard with a call and a type assertion in between.
- **A try/catch that cannot fall through ends a branch.** `if (seam === undefined) { try { return run() } catch (err) { throw err } }` left `seam` unguarded afterwards, because `endsInExit` read only the block's last statement and a `TryStatement` was not one of the forms it knew.

Twenty-five findings across burgee's parser and yargs façade go to zero.
