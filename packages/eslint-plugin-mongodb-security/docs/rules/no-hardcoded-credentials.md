# no-hardcoded-credentials

> **Keywords:** CWE-798, hardcoded credentials, MongoDB, authentication, security

Detects hardcoded MongoDB authentication credentials in connection options.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                 |
| ----------------- | --------------------------------------- |
| **CWE Reference** | CWE-798 (Hardcoded Credentials)         |
| **OWASP**         | A07:2021 - Identification/Auth Failures |
| **Severity**      | High (CVSS: 7.5)                        |
| **Category**      | Security                                |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-798 OWASP:A04 CVSS:9.8 | Hardcoded Credentials detected | CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Hardcoded Credentials detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/) |

## Rule Details

This rule detects when MongoDB connection options contain hardcoded `user`, `pass`, `password`, or `authSource` values.

### ❌ Incorrect

```typescript
// Hardcoded credentials in options object
mongoose.connect(uri, {
  user: 'admin',
  pass: 'secretPassword123',
});

// MongoClient options
const client = new MongoClient(uri, {
  auth: {
    username: 'admin',
    password: 'hardcodedSecret',
  },
});
```

### ✅ Correct

```typescript
// Use environment variables
mongoose.connect(uri, {
  user: process.env.MONGO_USER,
  pass: process.env.MONGO_PASS,
});

// Use config module
const client = new MongoClient(uri, {
  auth: {
    username: config.db.user,
    password: config.db.pass,
  },
});
```

## Known False Negatives

### Variables with Hardcoded Values

```typescript
// ❌ NOT DETECTED - hardcoded in variable, used in options
const password = 'secret';
mongoose.connect(uri, { pass: password });
```

## When Not To Use It

- In test files with test database credentials
- In development with local-only test databases

## Related Rules

- [no-hardcoded-connection-string](./no-hardcoded-connection-string.md)

## References

- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
