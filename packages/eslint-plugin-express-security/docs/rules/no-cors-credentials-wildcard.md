---
title: no-cors-credentials-wildcard
description: 'no-cors-credentials-wildcard'
category: security
tags: ['security', 'express']
---


> Disallow CORS credentials with wildcard origin

**Severity:** 🔴 Critical  
**CWE:** [CWE-942](https://cwe.mitre.org/data/definitions/942.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-942 OWASP:A01 CVSS:7.5 | CORS Misconfiguration detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-942](https://cwe.mitre.org/data/definitions/942.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `CORS Misconfiguration detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/) |

## Rule Details

This rule detects the dangerous combination of `credentials: true` with `origin: '*'` or `origin: true` in CORS configuration. While browsers block this specific combination, misconfigurations can still lead to credential leakage.

## Examples

### ❌ Incorrect

```javascript
// Credentials with wildcard - VULNERABLE
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

// Credentials with origin reflection - VULNERABLE
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
```

### ✅ Correct

```javascript
// Explicit origin with credentials - SAFE
app.use(
  cors({
    origin: 'https://app.example.com',
    credentials: true,
  }),
);

// Whitelist with credentials - SAFE
app.use(
  cors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    credentials: true,
  }),
);
```

## Options

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `false` | Allow in test files |

```json
{
  "rules": {
    "express-security/no-cors-credentials-wildcard": "error"
  }
}
```

## When Not To Use It

Never disable this rule. The combination of credentials with permissive origins is always dangerous.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variable

**Why**: CORS options stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Options from variable
const corsOptions = { origin: '*', credentials: true };
app.use(cors(corsOptions));
```

**Mitigation**: Use inline CORS options. Validate config at startup.

### Dynamic Origin Function

**Why**: Origin validation function logic is not analyzed.

```typescript
// ❌ NOT DETECTED - Vulnerable validation function
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // Always allows!
    credentials: true,
  }),
);
```

**Mitigation**: Review origin validation functions. Use allowlist patterns.

### Spread Configuration

**Why**: Spread hides actual configuration.

```typescript
// ❌ NOT DETECTED - Credentials in spread
const base = { credentials: true };
app.use(cors({ origin: '*', ...base }));
```

**Mitigation**: Avoid spreading CORS options. Define inline.

### Environment-Based Values

**Why**: Environment variable values aren't known at lint time.

```typescript
// ❌ NOT DETECTED - Values from env
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Could be '*'
    credentials: process.env.ENABLE_CREDS === 'true',
  }),
);
```

**Mitigation**: Validate environment config at startup. Use allowlist from env.

## Further Reading

- [OWASP CORS Misconfiguration](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
- [MDN: CORS and Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials)
