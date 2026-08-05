---
'@interlace/eslint-devkit': minor
'eslint-plugin-pg': patch
---

`no-unsafe-query` now follows same-file query helpers

The rule only ever treated a literal driver method call as a sink. Real
codebases do not call `client.query` at every call site — they wrap it once:

```ts
const q = (sql: string, params: unknown[]) => pool.query(sql, params);

q(`SELECT * FROM users WHERE id = ${userInput}`, []); // was silent
q('SELECT * FROM users WHERE id = ' + userInput, []); // was silent
```

Both of those are textbook CWE-89 and both went unreported — not because the
helper was hard to reach, but because the callee was named `q` instead of
`query`. The helper being in the _same file_, three lines above, made no
difference. Any project that wraps its driver once, which is most of them, was
getting no SQL injection coverage at all from this rule.

A function whose parameter is handed straight to a driver sink is now itself a
sink at that argument position, and calls to it are checked like the driver call
they stand for. `function` declarations, arrow functions in a `const`, class
methods and object-literal methods are all traced, including when the helper is
declared below its call site. Concatenation, interpolation, and a
previously-tainted variable passed to the helper all report.

Findings through a helper require the string to contain SQL keywords, even for
instances configured with `requireSqlKeywords: false` (`eslint-plugin-pg`).
"This identifier eventually reaches a sink" is weaker evidence than a literal
driver call, and without the gate a file that defined any helper over
`pool.query` would start reporting unrelated calls like ``log(`hello ${name}`)``.
A bare `query(...)` with no member access is likewise never treated as a driver
sink — only as a possible helper.

Parameterized calls through a helper stay silent, which is what
[#261](https://github.com/ofri-peretz/eslint/issues/261) asked for:
``q(`SELECT * FROM users WHERE id = $1`, [id])`` interpolates nothing and is
safe at any distance.

Helpers imported from another module are still not traced — that needs type
information the rule does not request. This is documented as a known false
negative rather than silently missing.

Affects `no-unsafe-query` in all eight SQL plugins: `pg`, `mysql-security`,
`prisma-security`, `drizzle-security`, `knex-security`, `sqlite-security`,
`typeorm-security` and `sequelize-security`.
