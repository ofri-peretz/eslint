---
title: no-unscoped-mutation
description: Require a chained `.where()` on Drizzle delete and update builders, so a bulk mutation cannot rewrite or delete every row in the table.
tags: ['security', 'drizzle']
category: security
severity: high
cwe: CWE-284
autofix: false
---

> **Keywords:** unscoped mutation, mass deletion, CWE-284, OWASP A01:2021, Drizzle, drizzle-orm, bulk delete, bulk update

<!-- @rule-summary -->

Require a chained `.where()` on Drizzle delete and update builders, so a bulk mutation cannot rewrite or delete every row in the table.
<!-- @/rule-summary -->

**CWE:** [CWE-284](https://cwe.mitre.org/data/definitions/284.html)
**OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

Detects Drizzle bulk mutations that reach every row in the table. This rule is part of [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-284](https://cwe.mitre.org/data/definitions/284.html) (Improper Access Control) |
| **Severity**      | High (CVSS 7.5)                                                                      |
| **Auto-Fix**      | ❌ No auto-fix available                                                             |
| **Category**      | Security                                                                             |

## Why this matters

A bulk mutation without a filter is one forgotten clause away from rewriting or
deleting the entire table. It type-checks, it passes review, and it usually only
shows up once it has run against production data. Drizzle's argument is the table (`db.delete(users)`), never a filter — the scope always arrives as a chained `.where()`.

## ❌ Incorrect

```ts
// Deletes every row in users
await db.delete(users);

// Rewrites every row
await db.update(users).set({ role: 'admin' });

// returning() is not a filter
await db.delete(users).returning();
```

## ✅ Correct

```ts
await db.delete(users).where(eq(users.id, id));

await db.update(users).set({ active: false }).where(eq(users.id, id));
```

## Known limitations

This rule reports only what it can prove. Scope that cannot be read statically is
treated as present, so the rule stays silent rather than guessing.

## When not to use it

Disable this rule in maintenance scripts, seeders, and test fixtures whose job is
to clear a table. Prefer a scoped `eslint-disable-next-line` on the specific call
over switching the rule off for the whole project.

## How a mutation is recognised (2026-10 review)

The receiver is judged by where it is written — an import of the driver, a
client built from it, a transaction handle it passes to a callback, a typed
parameter or class member, or a relative module that exports one — never by
its name. A `Map` or `Set` is never a table; an untraceable handle reports when its argument is a table the driver built (`db.delete(users)`).

Test files are skipped.

## Further reading

- [Drizzle documentation](https://orm.drizzle.team/docs/delete)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
