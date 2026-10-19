---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): `no-unsafe-query` policy gaps decided after the 2026-10-18 audit

- `$${x.length}` is a placeholder index only when `x` is an array the file builds (a literal, a `.map`/`.filter`/`.slice`/`.concat` result, or a binding annotated as an array). `$${req.body.x.length}` is reported: a JSON body can send `{"length": "1 OR 1=1"}`.
- `q ??= …`, `q ||= …` and `q &&= …` into a query variable are tracked like `+=`.
- A provably numeric value is safe outside `$N` as well: `${req.query.page * 10}`, `${+x}`, `${ids.map(Number).join(',')}`.
- An allowlist lookup in a `const` object or `new Map([...])` literal of fixed values — `${TABLES[req.query.t]}`, `${COLUMNS.get(req.query.sort)}` — is no longer reported, unless the table is written to after it is declared.
- `(SELECT …) UNION …`, `EXPLAIN …`, `SET …`, `SHOW …` and `VALUES (…)` are recognised as SQL statements.
