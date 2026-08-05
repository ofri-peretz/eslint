---
title: no-unsafe-query
description: SQL injection is one of the most critical security vulnerabilities
tags: ['security', 'postgres']
category: security
severity: medium
cwe: CWE-89
autofix: false
---

> Prevents SQL injection by detecting string concatenation or template literals with variables in `client.query()` calls.

<!-- @rule-summary -->

SQL injection is one of the most critical security vulnerabilities
<!-- @/rule-summary -->

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) (SQL Injection) |
| **Severity**      | Critical (CVSS: 9.8)                                                     |
| **Auto-Fix**      | ❌ No auto-fix available                                                 |
| **Category**      | Security                                                                 |
| **ESLint MCP**    | ✅ Optimized for AI assistant integration                                |
| **Best For**      | Protecting database operations from SQL injection vulnerabilities        |

## Value & investment case

> Why this rule pays for itself. Framework: [`cicd-impact/philosophy.md`](../../../../cicd-impact/philosophy.md).

| Dimension                    | Value                                                                                                                                                                                                                                                                              |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CWE**                      | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) — Improper Neutralization of Special Elements used in an SQL Command (CVSS 9.8 Critical)                                                                                                                                  |
| **Feedback-loop tier**       | Editor / pre-commit (sub-second) — cheapest layer per the [feedback-loop hierarchy](../../../../cicd-impact/philosophy.md#the-feedback-loop-hierarchy--why-a-high-end-static-analyzer-is-the-highest-leverage-investment)                                                          |
| **Defensive-layer leverage** | ~10× cheaper than unit-test · ~1,000× cheaper than production rollback · **10,000+× cheaper than disclosure** — SQL injection is the most-cited OWASP A03 finding ([cost-ratio anchors](../../../../cicd-impact/philosophy.md#deliverability-axis--quality-risk-and-ma-diligence)) |
| **Niche relevance**          | **Critical:** fintech (regulatory + transaction data), healthtech (PHI), B2B SaaS (multi-tenant exposure), cybersecurity · **High:** marketplaces, infra/devtools · **Medium:** B2C                                                                                                |
| **Investor-frame impact**    | SQL injection → full database disclosure → mandatory disclosure cycle. The most-cited single attack class in security-incident reports for two decades. Lint-time enforcement of parameterized queries is the cheapest possible structural defense.                                |

**Read also:** [`philosophy.md` §investor-frame](../../../../cicd-impact/philosophy.md#the-investor-frame--engineering-efficiency-as-a-portfolio-metric) · [`niche-presets.json`](../../../../cicd-impact/data/niche-presets.json) · [`analyzer-evaluation-framework.md`](../../../../cicd-impact/analyzer-evaluation-framework.md)

## Rule Details

SQL injection is one of the most critical security vulnerabilities. This rule detects potentially unsafe SQL query construction in `pg` driver calls.

### ❌ Incorrect

```typescript
// Template literal with variable
const result = await client.query(`SELECT * FROM users WHERE id = ${userId}`);

// String concatenation
const query = "SELECT * FROM users WHERE name = '" + userName + "'";
await pool.query(query);
```

### ✅ Correct

```typescript
// Parameterized query
const result = await client.query('SELECT * FROM users WHERE id = $1', [
  userId,
]);

// Named parameters (with pg-named or similar)
const result = await client.query({
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId],
});
```

### Query helpers

Almost nobody calls `client.query` directly everywhere; the driver call gets
wrapped in a one-line helper. When that helper lives in the same file, the rule
follows it: a parameter handed straight to `client.query` makes the helper a
sink at that argument position, and calls to it are checked like the driver
call they stand for.

```typescript
const q = (sql: string, params: unknown[]) => client.query(sql, params);

q(`SELECT * FROM users WHERE id = ${userId}`, []); // ❌ reported
q('SELECT * FROM users WHERE id = ' + userId, []); // ❌ reported
q('SELECT * FROM users WHERE id = $1', [userId]); // ✅ fine — nothing interpolated
```

`function` declarations, class methods and object-literal methods are traced
the same way. Because a helper is weaker evidence than a literal driver call,
findings through one require the string to actually look like SQL:

```typescript
const q = (sql: string, params: unknown[]) => client.query(sql, params);

q(`hello ${name}`, []); // ✅ no SQL keywords — not a SQL finding
client.query(`hello ${name}`); // ❌ still reported at the driver call itself
```

For helpers imported from another module, see
[the known false negative below](#query-helpers-defined-in-another-file).

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-89 OWASP:A05 CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                                                     |
| :------------------------ | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Risk Standards**        | Security benchmarks    | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description**     | Specific vulnerability | `SQL Injection detected`                                                                                                                                                                                                                                    |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]`                                                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                                                        |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A05_2021-Injection/)                                                                                                                                                                                                 |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Tagged Template Literals (sql`...`)

**Why**: Tagged templates like `sql` from libraries are function calls, not template literals.

```typescript
// ❌ NOT DETECTED - appears safe but may not be
import { sql } from 'some-library';
await client.query(sql`SELECT * FROM users WHERE id = ${userId}`);
// If 'sql' doesn't properly escape, this is vulnerable!
```

**Mitigation**: Use a library verified to properly escape tagged templates.

### Dynamic Query Variables

**Why**: When the query is stored in a variable, we can't analyze its construction.

```typescript
// ❌ NOT DETECTED
const unsafeQuery = buildQuery(userInput); // May concatenate strings internally
await client.query(unsafeQuery);
```

**Mitigation**: Always use parameterized queries `($1, $2)` directly in literals.

### Query Helpers Defined in Another File

Helpers **declared in the same file** as the call site are traced (see
[Query helpers](#query-helpers) above). Helpers imported from another module
are not: the rule is not type-aware, so it cannot see that `q` forwards its
first argument to `client.query`.

```typescript
// db.ts
export const q = (sql: string, params: unknown[]) => client.query(sql, params);

// user.ts
import { q } from './db';
q(`SELECT * FROM users WHERE id = ${userId}`, []); // ❌ NOT DETECTED
```

**Mitigation**: Keep the driver call and the interpolation in the same module,
or interpolate nothing — build the string with `$1, $2` placeholders and pass
values through the `params` array, which is safe at any distance.

### Format Functions with User Input

**Why**: The rule doesn't track data flow through `pg-format` or similar.

```typescript
// ❌ NOT DETECTED - but format() should handle escaping
import format from 'pg-format';
await client.query(format('SELECT * FROM %I.users', userSchema));
// Safe if format() escapes, but rule can't verify
```

**Mitigation**: Use parameterized queries for values; use verified formatters only for identifiers.

## When Not To Use It

- When using a query builder (Drizzle, Kysely) that handles parameterization
- In migration files with static SQL

## Implementation

The AST work — concatenation, template interpolation, and taint through a
variable — is not Postgres-specific, so it lives in `@interlace/eslint-devkit`
as `createSqlInjectionRule`. This rule instantiates it with the pg sink
(`.query()`) and the pg remediation copy (`$1, $2`, node-postgres docs).

Each driver plugin instantiates the same detector with its own sinks and
remediation copy, so a project only ever installs the rule for the driver it
actually uses — and only ever gets one finding per line.

## Related Rules

- [check-query-params](./check-query-params.md) - Validates parameter count
- [no-batch-insert-loop](./no-batch-insert-loop.md) - Prevents N+1 queries
