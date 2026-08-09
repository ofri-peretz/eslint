---
title: no-unscoped-mutation
description: Require a `where` filter on Prisma bulk mutations, so deleteMany and updateMany cannot rewrite or delete every row in the table.
tags: ['security', 'prisma']
category: security
severity: high
cwe: CWE-284
autofix: false
---

> **Keywords:** unscoped mutation, mass deletion, CWE-284, OWASP A01:2021, Prisma, @prisma/client, bulk delete, bulk update

<!-- @rule-summary -->
Require a `where` filter on Prisma bulk mutations, so deleteMany and updateMany cannot rewrite or delete every row in the table.
<!-- @/rule-summary -->

**CWE:** [CWE-284](https://cwe.mitre.org/data/definitions/284.html)
**OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

Detects Prisma bulk mutations that reach every row in the table. This rule is part of [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security).

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
shows up once it has run against production data. Prisma has no instance-mutation methods, so `deleteMany()` is always the bulk form and a call with no filter is always unscoped.

## ❌ Incorrect

```ts
// Deletes every user in the table
await prisma.user.deleteMany();

// Empty options is not a filter
await prisma.user.deleteMany({});

// Grants admin to every row
await prisma.user.updateMany({ data: { role: 'admin' } });
```

## ✅ Correct

```ts
await prisma.user.deleteMany({ where: { active: false } });

await prisma.user.updateMany({
  where: { authorId },
  data: { role: 'admin' },
});

// Single-record operations are inherently scoped
await prisma.user.delete({ where: { id } });
```

## Known limitations

This rule reports only what it can prove. Scope that cannot be read statically is
treated as present, so the rule stays silent rather than guessing.

A filter built elsewhere (`prisma.user.deleteMany(buildFilter(req.query))`) cannot be read statically and is deliberately not reported — see [Known limitations](#known-limitations).

## When not to use it

Disable this rule in maintenance scripts, seeders, and test fixtures whose job is
to clear a table. Prefer a scoped `eslint-disable-next-line` on the specific call
over switching the rule off for the whole project.

## Further reading

- [Prisma documentation](https://www.prisma.io/docs/orm/prisma-client/queries/crud#delete-all-records)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
