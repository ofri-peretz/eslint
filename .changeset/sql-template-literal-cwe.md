---
'@interlace/eslint-devkit': patch
---

`no-unsafe-query` now reports CWE-89 on the template-literal path, not just the concatenation path

`createSqlInjectionRule` builds two findings for the same vulnerability and picks
between them on shape: `noUnsafeQuery` for concatenation, `unsafeTemplateLiteral`
for an interpolated template. Only the first carried standards metadata, so a
finding like this

```js
db.query(`SELECT * FROM users WHERE id = ${userInput}`);
```

was emitted with no CWE, no OWASP category and no compliance tags — while the
equivalent `'...' + userInput` reported `CWE-89 OWASP:A03 CVSS:9.8`. Anything
grouping findings by CWE (SARIF consumers, security dashboards, our own corpus
scoring) therefore counted only half of every SQL injection rule, and the half it
missed is the idiomatic modern way to write the bug.

Both messages now take their CWE from the same `meta.docs.cwe` the rule
documents. This affects the `no-unsafe-query` rule in all eight SQL plugins:
`pg`, `mysql-security`, `prisma-security`, `drizzle-security`, `knex-security`,
`sqlite-security`, `typeorm-security` and `sequelize-security`.

Detection behaviour is unchanged — the same code reports in the same places, with
the same severity. Only the emitted message text gains the standards tokens.
