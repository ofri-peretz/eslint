---
title: no-hardcoded-credentials
description: Prevents hardcoded passwords and connection strings in PostgreSQL client initialization.
tags: ['security', 'postgres']
category: security
severity: critical
cwe: CWE-798
autofix: false
---

> **Keywords:** credentials, passwords, secrets, CWE-798, pg, node-postgres, security

<!-- @rule-summary -->
Prevents hardcoded passwords and connection strings in PostgreSQL client initialization.
<!-- @/rule-summary -->

**CWE:** [CWE-522](https://cwe.mitre.org/data/definitions/522.html)

Prevents hardcoded passwords and connection strings in PostgreSQL client initialization.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                         |
| ----------------- | ------------------------------- |
| **CWE Reference** | CWE-798 (Hardcoded Credentials) |
| **Severity**      | High (CVSS: 7.5)                |
| **Category**   | Security |

## Rule Details

Hardcoded credentials in source code can be exposed through version control, logs, or error messages.

### ❌ Incorrect

```typescript
// Hardcoded password
const client = new Client({
  password: 'supersecret123',
});

// Hardcoded connection string
const pool = new Pool('postgres://user:password@localhost/db');
```

### ✅ Correct

```typescript
// Environment variables
const client = new Client({
  password: process.env.PG_PASSWORD,
});

// Connection string from environment
const pool = new Pool(process.env.DATABASE_URL);

// Config file (not committed to VCS)
const config = require('./config.local.json');
const client = new Client(config.database);
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-798 OWASP:A04 CVSS:9.8 | Hardcoded Credentials detected | CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `Hardcoded Credentials detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Template Literals with Credentials

**Why**: The rule only checks `Literal` nodes, not template literals.

```typescript
// ❌ NOT DETECTED
const client = new Client({
  password: `supersecret123`, // Template literal, not string literal
});
```

### Factory Functions

**Why**: Credentials passed through function calls aren't traced.

```typescript
// ❌ NOT DETECTED
function getConfig() {
  return { password: 'hardcoded' };
}
const client = new Client(getConfig());
```

### Spread Operator

**Why**: The rule iterates over properties, not spread sources.

```typescript
// ❌ NOT DETECTED
const secrets = { password: 'hardcoded' };
const client = new Client({ ...secrets });
```

### Variable References

**Why**: Values stored in variables aren't traced to their literal origin.

```typescript
// ❌ NOT DETECTED
const password = 'supersecret123';
const client = new Client({ password });
```

> **Workaround**: Use secret scanning tools (e.g., gitleaks, truffleHog) in CI/CD.

## When Not To Use It

- In test files with fixture data
- In documentation examples

## Related Rules

- [no-insecure-ssl](./no-insecure-ssl.md) - Prevents insecure SSL settings