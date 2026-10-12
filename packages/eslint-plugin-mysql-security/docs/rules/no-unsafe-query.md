---
title: no-unsafe-query
description: Prevent SQL injection by disallowing string concatenation or interpolated template literals in mysql/mysql2 queries.
tags: ['security', 'mysql']
category: security
severity: critical
cwe: CWE-89
autofix: false
---

> **Keywords:** SQL injection, CWE-89, OWASP A03:2021, MySQL, mysql2 / mysql, raw query, parameterized query

<!-- @rule-summary -->

Prevent SQL injection by disallowing string concatenation or interpolated template literals in mysql/mysql2 queries.
<!-- @/rule-summary -->

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects SQL injection in MySQL raw queries. This rule is part of [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security).

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

1. String concatenation — `conn.query('SELECT ... ' + value)`
2. Template interpolation — ``conn.query(`SELECT ... ${value}`)``
3. A variable tainted by either, including via `+=`, then passed to a sink

### Sinks

`connection.query()` and `connection.execute()` — the mysql2 prepared-statement
API — including the options form `query({ sql, values })`. `.escape()`,
`.escapeId()` and `.format()` (from the driver or `sqlstring`) count as
escaping; MySQL reads `"…"` as a string, so a value inside one is a value.

### ❌ Incorrect

```typescript
await conn.query(`SELECT * FROM users WHERE id = ${userId}`);

await conn.query('SELECT * FROM users WHERE email = ' + email);

let sql = 'SELECT * FROM products WHERE 1=1';
sql += ` AND name = '${name}'`;
await conn.query(sql);
```

### ✅ Correct

```typescript
conn.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

## Known limitations

- A method chosen at runtime — `conn[verb](...)` — names nothing to
  match against the sink list, so it is not reported. The quoted spelling
  `conn['query'](...)` names `query` and IS reported.
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
  An escaper's output carries its own quotes, so inside `'…'` or an
  identifier quote it closes the author's token: there an escaped value is
  reported unless what was escaped is itself fixed (Quint oracle, 2026-10).
- Request data handed over as the whole SQL text is reported too.

The receiver is judged by where it is written, never by its name: a method of
another library that shares the name (`/re/.exec`, `child_process.exec`, a
GraphQL client's `query`) is not a sink, and the statement-shape check
(`SELECT … FROM`, `INSERT INTO`, `UPDATE … SET`, …) applies only when the
receiver cannot be traced to the driver. Test files are skipped.

## Implementation

The detection is shared across the driver plugins via `createSqlInjectionRule`
in `@interlace/eslint-devkit`; this rule supplies MySQL's sinks and
remediation copy. Install the plugin matching your stack and you get exactly
one finding per line.

## Further Reading

- [MySQL — parameterized queries](https://sidorares.github.io/node-mysql2/docs#using-prepared-statements)
- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
