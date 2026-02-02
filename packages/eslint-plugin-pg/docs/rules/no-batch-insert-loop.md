---
title: no-batch-insert-loop
description: Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern).
tags: ['security', 'postgres']
category: security
severity: medium
cwe: CWE-400
autofix: false
---

> **Keywords:** N+1 queries, performance, CWE-400, pg, node-postgres, bulk operations

<!-- @rule-summary -->
Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern).
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern).

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                       |
| ----------------- | ----------------------------- |
| **CWE Reference** | CWE-400 (Resource Exhaustion) |
| **Severity**      | Medium (performance)          |
| **Category**   | Security |

## Rule Details

Executing mutation queries in loops creates N+1 query problems, causing:

- Database connection exhaustion
- Slow execution times
- Transaction timeout issues

### ❌ Incorrect

```typescript
// N+1 inserts
for (const user of users) {
  await client.query('INSERT INTO users VALUES ($1, $2)', [user.id, user.name]);
}

// forEach with mutations
users.forEach(async (user) => {
  await pool.query('UPDATE users SET active = true WHERE id = $1', [user.id]);
});

// map with mutations
users.map((user) => client.query('INSERT INTO users VALUES ($1)', [user.id]));
```

### ✅ Correct

```typescript
// Bulk insert with unnest
await client.query(
  'INSERT INTO users SELECT * FROM unnest($1::int[], $2::text[])',
  [users.map((u) => u.id), users.map((u) => u.name)],
);

// pg-format for batching
const values = users.map((u) => [u.id, u.name]);
await client.query(format('INSERT INTO users VALUES %L', values));

// ANY for bulk updates
await client.query('UPDATE users SET active = true WHERE id = ANY($1)', [
  userIds,
]);
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-400 OWASP:A06 CVSS:7.5 | Uncontrolled Resource Consumption (ReDoS) detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Uncontrolled Resource Consumption (ReDoS) detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Async Iterators

**Why**: The rule doesn't traverse `for await...of` as a loop type.

```typescript
// ❌ NOT DETECTED
async function* getUsers() {
  yield* users;
}
for await (const user of getUsers()) {
  await client.query('INSERT INTO users VALUES ($1)', [user.id]);
}
```

### Recursive Functions

**Why**: Recursion creates implicit loops that require call graph analysis.

```typescript
// ❌ NOT DETECTED
async function insertUsers(users: User[], i = 0): Promise<void> {
  if (i >= users.length) return;
  await client.query('INSERT INTO users VALUES ($1)', [users[i].id]);
  return insertUsers(users, i + 1); // Recursive N+1!
}
```

### Promise.all with Mapping

**Why**: The rule only detects direct `.map()` callbacks, not when wrapped in `Promise.all`.

```typescript
// ❌ NOT DETECTED - Array.from pattern
const queries = Array.from(users, (u) =>
  client.query('INSERT INTO users VALUES ($1)', [u.id]),
);
await Promise.all(queries);
```

### External Loop Functions

**Why**: Queries called from a helper function inside a loop are not detected.

```typescript
// ❌ NOT DETECTED
async function insertUser(user: User) {
  await client.query('INSERT INTO users VALUES ($1)', [user.id]);
}
for (const user of users) {
  await insertUser(user); // N+1 but rule can't see into helper
}
```

> **Workaround**: Use `UNNEST()` for bulk inserts or `ANY()` for bulk updates.

## When Not To Use It

- When processing results in a streaming fashion with backpressure
- For operations that must be transactionally isolated per item
- When using a batching library (e.g., DataLoader) that coalesces queries

## Related Rules

- [no-select-all](./no-select-all.md) - Query performance