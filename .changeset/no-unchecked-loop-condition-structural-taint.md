---
"eslint-plugin-secure-coding": patch
---

`no-unchecked-loop-condition` no longer infers user input from identifier names.

Taint was decided by substring-matching identifiers — and the printed text of
whole expressions — against
`['req','request','body','query','params','input','data']`, with
`includes('input')` and `includes('data')` OR-ed in unconditionally. So
`metadataMap`, `dataSource`, `queryBuilder`, `LoggerRequestIdHeaders` and a
local `query` object all read as attacker-controlled.

The guess also propagated: a variable whose initializer *text* mentioned one of
those names joined the taint set, so `const found = coll.find(query)` made
`found` tainted and every later `for (const r of found)` a finding.

Taint now starts only at a real request object (`req`, `request`, `ctx`,
`context`, `event`) and spreads by assignment, seeded from the initializer's
AST rather than its printed text. `req.query` is evidence; `query` is a name.

28 findings across express, ultimate-backend and ack-nestjs-boilerplate drop to
1 — a genuine true positive iterating `ctx.headers`. Request-derived loops
still report, directly and through assignment.
