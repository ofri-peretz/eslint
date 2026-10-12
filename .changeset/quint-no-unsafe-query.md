---
'eslint-plugin-postgresql-security': minor
---

fix(postgresql-security): `no-unsafe-query` follows values through `let`, same-file helpers and pure text calls

A Quint model of the rule's contract, `benchmarks/quint/models/postgresql-security.no-unsafe-query.qnt`, generated 1,892 distinct query shapes. In 804 of them the rule reported a value that cannot carry injected text:

- An escaped or numeric value that reached the query through a reassigned `let`, for example `let where = ''; if (x) where = format('%L', x);`.
- A value returned by a same-file helper, for example `const pick = () => escapeLiteral(name)`.
- A pure text call over static values, for example `['a', 'b'].join(', ')` or `String(42).trim()`.

A local binding is now judged by every value written to it, and a zero-argument same-file helper by every value it can return. Both are bounded at 8 hops with cycles guarded. Fixed arrays and their `.length` count as fixed.

An array or object that is later mutated (`cols.push(k)`, `o.c = …`), passed to another function, spread or returned still counts as unknown. That closes a false negative the constant-object check already had.

The model and its generated cases now run as a lock in `benchmarks/__tests__/quint-oracle.lock.test.ts`.
