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

`connection.query()` and `connection.execute()` — the mysql2 prepared-statement API. `.execute()` is not a SQL-only method name, so a finding also requires a SQL keyword in the static text.

Because several of these are common method names outside MySQL, a finding additionally requires a SQL keyword (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `FROM`, `WHERE`, `VALUES`, …) in the **static** part of the string.

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
- Taint tracking is single-scope and name-based — it does not follow a query
  string across function boundaries.

## Implementation

The detection is shared across the driver plugins via `createSqlInjectionRule`
in `@interlace/eslint-devkit`; this rule supplies MySQL's sinks and
remediation copy. Install the plugin matching your stack and you get exactly
one finding per line.

## Further Reading

- [MySQL — parameterized queries](https://sidorares.github.io/node-mysql2/docs#using-prepared-statements)
- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
