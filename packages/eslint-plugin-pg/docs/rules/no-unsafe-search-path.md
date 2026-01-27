---
title: no-unsafe-search-path
description: no-unsafe-search-path
category: security
severity: medium
tags: ['security', 'postgres']
autofix: false
---


> **Keywords:** search_path, schema hijacking, CWE-426, pg, node-postgres, security
**CWE:** [CWE-22](https://cwe.mitre.org/data/definitions/22.html)

Prevents dynamic `SET search_path` queries that could enable schema hijacking.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                         |
| ----------------- | ------------------------------- |
| **CWE Reference** | CWE-426 (Untrusted Search Path) |
| **Severity**      | High (CVSS: 7.5)                |
| **Category**   | Security |

## Rule Details

If an attacker controls the `search_path`, they can redirect function/table lookups to malicious schema objects.

### ❌ Incorrect

```typescript
// Dynamic schema from user input
await client.query(`SET search_path TO ${userSchema}`);

// Template literal with variable
await pool.query(`SET search_path = ${schema}`);

// Concatenation
await client.query('SET search_path = ' + userSchema);
```

### ✅ Correct

```typescript
// Static schema name
await client.query('SET search_path = public, my_schema');

// Safe: using pg-format with schema validation
if (!ALLOWED_SCHEMAS.includes(schema)) throw new Error('Invalid schema');
await client.query(format('SET search_path = %I', schema));

// Using validated schema from allowlist
const safeSchema = validateSchema(userInput); // throws if invalid
await client.query('SET search_path = $1', [safeSchema]);
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-426 OWASP:A03 CVSS:7.5 | Untrusted Search Path detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A03_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-426](https://cwe.mitre.org/data/definitions/426.html) [OWASP:A03](https://owasp.org/Top10/A03_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Untrusted Search Path detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A03_2021-Injection/) |

## When Not To Use It

- For multi-tenant apps where schema is validated from a trusted source
- In admin tools where schema input is fully controlled

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Query from Variable

**Why**: Query strings in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - SET search_path in variable
const searchPathQuery = `SET search_path = ${userSchema}`;
await client.query(searchPathQuery);
```

**Mitigation**: Use inline query strings. Define safe schema constants.

### pg-format or Identifier Escaping

**Why**: pg-format's %I formatting looks like safe escaping but may still be vulnerable.

```typescript
// ❌ NOT DETECTED (and may be safe) - pg-format used
import format from 'pg-format';
await client.query(format('SET search_path = %I', userSchema));
// ^^ pg-format doesn't validate schema existence
```

**Mitigation**: Validate schema against allowlist before using. Don't rely on escaping alone.

### Multi-Tenant Schema Selection

**Why**: Complex tenant resolution logic is not understood.

```typescript
// ❌ NOT DETECTED - Tenant-based schema
const schema = getTenantSchema(req.headers['x-tenant-id']);
await client.query(`SET search_path = ${schema}`);
```

**Mitigation**: Use centralized tenant schema resolver with allowlist validation.

### Connection Pool Configuration

**Why**: search_path set in pool configuration is not checked.

```typescript
// ❌ NOT DETECTED - search_path in pool options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=${userSchema}`, // Dynamic!
});
```

**Mitigation**: Validate pool configuration at startup. Use static search_path values.

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - SQL injection prevention
