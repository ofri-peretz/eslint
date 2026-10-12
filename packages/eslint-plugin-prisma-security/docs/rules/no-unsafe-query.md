---
title: no-unsafe-query
description: Prevent SQL injection by disallowing string concatenation or interpolated template literals in Prisma raw queries.
tags: ['security', 'prisma']
category: security
severity: critical
cwe: CWE-89
autofix: false
---

> **Keywords:** SQL injection, CWE-89, OWASP A03:2021, Prisma, @prisma/client, raw query, parameterized query

<!-- @rule-summary -->

Prevent SQL injection by disallowing string concatenation or interpolated template literals in Prisma raw queries.
<!-- @/rule-summary -->

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects SQL injection in Prisma raw queries. This rule is part of [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) (SQL Injection) |
| **Severity**      | Critical (CVSS 9.8)                                                      |
| **Auto-Fix**      | ❌ No auto-fix available                                                 |
| **Category**      | Security                                                                 |

## Rule Details

Reports three shapes when they reach a raw-SQL sink:

1. String concatenation — `prisma.$queryRawUnsafe('SELECT ... ' + value)`
2. Template interpolation — ``prisma.$queryRawUnsafe(`SELECT ... ${value}`)``
3. A variable tainted by either, including via `+=`, then passed to a sink

### Sinks

`$queryRawUnsafe()`, `$executeRawUnsafe()` and `Prisma.raw()`. The safe
`$queryRaw` / `$executeRaw` / `Prisma.sql` tagged templates parameterize their
interpolations; `Prisma.join`, `Prisma.empty` and a nested `Prisma.sql`
fragment are parameterised too.

### ❌ Incorrect

```typescript
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${userId}`);

await prisma.$queryRawUnsafe('SELECT * FROM users WHERE email = ' + email);

let sql = 'SELECT * FROM products WHERE 1=1';
sql += ` AND name = '${name}'`;
await prisma.$queryRawUnsafe(sql);
```

### ✅ Correct

```typescript
await prisma.$queryRaw`SELECT * FROM User WHERE email = ${email}`;
```

## Known limitations

- A method chosen at runtime — `prisma[verb](...)` — names nothing to
  match against the sink list, so it is not reported. The quoted spelling
  `prisma['$queryRawUnsafe'](...)` names `$queryRawUnsafe` and IS reported.
- Values are followed within the file, and through RELATIVE imports read from
  disk. A path alias (`@/lib/db`) is not resolved, so a handle imported through
  one is judged by the call's own shape.
- A file that reaches the driver only through a relative module is checked for
  the sinks `secure-coding/no-sql-injection` does not cover; `query()` /
  `execute()` in such a file belong to that rule, so the line is never
  reported twice.

## What is reported, and what is not (2026-10 review)

A value spliced into the SQL text is reported only when this file cannot prove
it fixed:

- **Value positions** — after `=`, `<`, `LIKE`, inside `'…'`, in an `IN (…)` or
  `VALUES (…)` list, after `LIMIT` — always have a bind parameter, so any value
  the rule cannot prove fixed is a finding there: a parameter, request data,
  an unknown call.
- **Fragment positions** — a table or column name, an `ORDER BY` target, a whole
  clause or subquery spliced in — have no bind parameter, so composing them is
  how such statements are built. There a hole is reported once the file traces
  it to the inbound request (`ORDER BY ${req.query.sort}`), not merely because
  it is unproven.
- **Provably fixed** values are never reported: literals and constants, enum
  and `const`-object members, a ternary between two literals, numbers
  (`Number()`, `Math.*`, arithmetic, `.length`), a `?` placeholder list such as
  `ids.map(() => '?').join(',')`, a lookup into a fixed map, a value checked
  against an anchored-regex or fixed-list allowlist first, a local helper every
  `return` of which is fixed, and the driver's own escapers and fragments.
- Request data handed over as the whole SQL text is reported too.

The receiver is judged by where it is written, never by its name: a method of
another library that shares the name (`/re/.exec`, `child_process.exec`, a
GraphQL client's `query`) is not a sink, and the statement-shape check
(`SELECT … FROM`, `INSERT INTO`, `UPDATE … SET`, …) applies only when the
receiver cannot be traced to the driver. Test files are skipped.

## Implementation

The detection is shared across the driver plugins via `createSqlInjectionRule`
in `@interlace/eslint-devkit`; this rule supplies Prisma's sinks and
remediation copy. Install the plugin matching your stack and you get exactly
one finding per line.

## Further Reading

- [Prisma — parameterized queries](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#queryrawunsafe)
- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
