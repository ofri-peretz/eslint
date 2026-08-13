---
title: no-sql-injection
description: Detects SQL statements built from attacker-controlled input in files that import no SQL driver
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-89
autofix: false
---

> **Keywords:** SQL injection, CWE-89, parameterized query, string concatenation, template literal, driver-agnostic

<!-- @rule-summary -->
Detects SQL statements built from attacker-controlled input in files that import no SQL driver
<!-- @/rule-summary -->

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html)
**OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

Detects SQL injection where the query is executed through a handle the file never
imported. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                             |
| ----------------- | ------------------------------------------------------------------- |
| **CWE Reference** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) (SQL Injection) |
| **Severity**      | Critical (CVSS 9.8)                                                 |
| **Auto-Fix**      | ❌ No — the fix changes the call's argument shape                    |
| **Category**      | Security                                                            |

## Why this rule exists (and why it is not in a driver plugin)

The driver-scoped rules — `postgresql-security/no-unsafe-query`,
`mysql-security`, `typeorm-security`, `knex-security`, `drizzle-security`,
`sqlite-security`, `sequelize-security`, `prisma-security` — each abstain in a
file that does not import their own driver. That gate is deliberate: keying on
a method name alone made `.query()` mean typeorm *and* pg *and* mysql2 at once,
and one defect was billed up to three times.

It leaves a gap. The most common Node layout puts the pool in one module:

```js
// db.js
const { Pool } = require('pg');
module.exports = new Pool();
```

and every route file then does `db.query(...)` with **no driver import at all**.
Those files are injectable and no driver rule can see them.

This rule owns exactly that complement: it reports **only** in files that import
no SQL driver, so any given query site is owned by exactly one rule and
`recommended` never reports the same line twice.

## What it takes to report

All four must hold — the rule is deliberately quiet otherwise:

1. **A raw-SQL sink** — `.query(...)` or `.execute(...)`.
2. **A built string** — concatenation or an interpolated template literal. A
   plain literal cannot be injected into.
3. **A statement shape** — the static text reads as SQL: `SELECT … FROM`,
   `INSERT INTO`, `UPDATE … SET`, `DELETE FROM`, `REPLACE INTO`, `MERGE INTO`.
   A lone verb is not enough; `'update available for ' + pkg` is a status
   message, not a statement.
4. **An attributable source** — the interpolated value traces to an inbound
   request (`req` / `request` / `ctx` with `body`, `query`, `params`, `headers`,
   `cookies`, `url`, `path`), directly or through a written-once local binding.

"I cannot prove this is safe" is not a finding. A query built from a function
parameter, a module constant or a config value is a query builder doing its job.

## Examples

### ❌ Incorrect

```js
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ' + userId;
db.query(query);
```

```js
const name = req.body.name;
db.query(`SELECT * FROM users WHERE name = '${name}'`);
```

```js
// Identifiers cannot be bound as parameters — allow-list them instead.
const sortColumn = req.query.sort;
db.query('SELECT * FROM users ORDER BY ' + sortColumn);
```

### ✅ Correct

```js
// Bind the value as a parameter.
db.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
```

```js
// A prepared-statement object is not a built string.
db.query({ name: 'get-user', text: 'SELECT * FROM users WHERE id = $1', values: [id] });
```

```js
// A column name cannot be a bound parameter — validate it against an allow-list.
const SORTABLE = new Set(['name', 'created_at']);
const column = SORTABLE.has(req.query.sort) ? req.query.sort : 'name';
db.query('SELECT * FROM users ORDER BY ' + column);
```

```js
// A file that imports its driver belongs to that driver's rule, not this one.
import { Pool } from 'pg';
pool.query('SELECT * FROM users WHERE id = ' + req.params.id); // → pg/no-unsafe-query
```

## Known limits

- A **reassigned** query builder (`let sql = '…'; sql += ' AND x = ' + x`) is not
  followed. The driver-scoped rules track `+=` because they already know the
  file is a database file; guessing at it in a rule that runs on every file with
  no driver evidence at all is how a precise rule becomes a noisy one.
- A value wrapped in a call — `escapeIdentifier(req.query.sort)` — breaks
  attribution on purpose. That call is the documented fix for this very
  finding, so reporting it would flag code that is already correct.

## Options

None.

## When Not To Use It

If your project reaches its database exclusively through an imported driver,
the driver-specific plugin already covers you and this rule will simply never
fire.

## Related

- [`postgresql-security/no-unsafe-query`](https://www.npmjs.com/package/eslint-plugin-postgresql-security)
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
