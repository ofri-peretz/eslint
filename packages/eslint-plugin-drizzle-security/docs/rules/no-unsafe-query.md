---
title: no-unsafe-query
description: Prevent SQL injection by disallowing string concatenation or interpolated template literals in Drizzle sql.raw() calls.
tags: ['security', 'drizzle']
category: security
severity: critical
cwe: CWE-89
autofix: false
---

> **Keywords:** SQL injection, CWE-89, OWASP A03:2021, Drizzle, drizzle-orm, raw query, parameterized query

<!-- @rule-summary -->
Prevent SQL injection by disallowing string concatenation or interpolated template literals in Drizzle sql.raw() calls.
<!-- @/rule-summary -->

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects SQL injection in Drizzle raw queries. This rule is part of [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security).

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

1. String concatenation — `sql.raw('SELECT ... ' + value)`
2. Template interpolation — ``sql.raw(`SELECT ... ${value}`)``
3. A variable tainted by either, including via `+=`, then passed to a sink

### Sinks

`sql.raw()` only. The safe `sql` tagged template parameterizes its interpolations and is a different AST node, so it can never be reported.

### ❌ Incorrect

```typescript
await sql.raw(`SELECT * FROM users WHERE id = ${userId}`);

await sql.raw('SELECT * FROM users WHERE email = ' + email);

let sql = 'SELECT * FROM products WHERE 1=1';
sql += ` AND name = '${name}'`;
await sql.raw(sql);
```

### ✅ Correct

```typescript
db.select().from(users).where(sql`id = ${userId}`);
```

## Known limitations

- A method chosen at runtime — `sql[verb](...)` — names nothing to
  match against the sink list, so it is not reported. The quoted spelling
  `sql['raw'](...)` names `raw` and IS reported.
- Taint tracking is single-scope and name-based — it does not follow a query
  string across function boundaries.

## Implementation

The detection is shared across the driver plugins via `createSqlInjectionRule`
in `@interlace/eslint-devkit`; this rule supplies Drizzle's sinks and
remediation copy. Install the plugin matching your stack and you get exactly
one finding per line.

## Further Reading

- [Drizzle — parameterized queries](https://orm.drizzle.team/docs/sql#sqlraw)
- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
