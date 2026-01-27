---
title: no-permissive-cors
description: "CWE: [CWE-942](https://cwe.mitre.org/data/definitions/942.html)"
category: security
severity: medium
tags: ['security', 'browser']
autofix: false
---

> **Keywords:** no permissive cors, security, ESLint rule, [CWE-942](https://cwe.mitre.org/data/definitions/942.html), Access-Control-Allow-Origin, wildcard, API security
> **CWE:** [CWE-942: Permissive Write of Outbound HTTP Headers](https://cwe.mitre.org/data/definitions/942.html)  
> **OWASP Mobile:** [OWASP Mobile Top 10 M8: Security Misconfiguration](https://owasp.org/www-project-mobile-top-10/)

ESLint Rule: no-permissive-cors. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect          | Details                                        |
| --------------- | ---------------------------------------------- |
| **Severity**    | High (Data Exposure)                           |
| **Auto-Fix**    | ❌ No (requires allowlist logic)               |
| **Category**   | Security |
| **ESLint MCP**  | ✅ Optimized for ESLint MCP integration        |
| **Best For**    | Node.js servers with public APIs               |
| **Suggestions** | ✅ Advice on using origin validation functions |

## Vulnerability and Risk

**Vulnerability:** Permissive Cross-Origin Resource Sharing (CORS) occurs when an application sets `Access-Control-Allow-Origin` to `*` or reflects the `Origin` header without validation.

**Risk:** Any website can make requests to your API. If your API relies on ambient credentials (like cookies), a malicious site can exfiltrate sensitive user data or perform actions on behalf of the user.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-942 OWASP:M8 | Permissive CORS detected | HIGH [DataExfiltration,CSRF]
   Fix: Do not use wildcard (*) for CORS origin; use an allowlist | https://cwe.mitre.org/data/definitions/942.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                             |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-942](https://cwe.mitre.org/data/definitions/942.html) [OWASP:M8](https://owasp.org/www-project-mobile-top-10/) |
| **Issue Description**     | Specific vulnerability | `Permissive CORS detected`                                                                                          |
| **Severity & Compliance** | Impact assessment      | `HIGH [DataExfiltration,CSRF]`                                                                                      |
| **Fix Instruction**       | Actionable remediation | `Do not use wildcard (*) for CORS origin`                                                                           |
| **Technical Truth**       | Official reference     | [Permissive HTTP Headers](https://cwe.mitre.org/data/definitions/942.html)                                          |

## Rule Details

This rule flags configurations that explicitly use the `*` wildcard in CORS headers or middleware settings (like the `cors` npm package).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[CORS Configuration] --> B{Origin is '*'}
    B -->|Yes| C[🚨 High Security Risk]
    B -->|No| D{Origin is Dynamic Reflected?}
    D -->|Yes| E[🚨 High Security Risk (if unvalidated)]
    D -->|No| F[✅ Secure Configuration]
```

### Why This Matters

| Issue             | Impact                                | Solution                                        |
| ----------------- | ------------------------------------- | ----------------------------------------------- |
| 🕵️ **Data Theft** | Private user data exposed to any site | Use a strict allowlist of trusted origins       |
| 🚀 **CSRF**       | Actions performed without user intent | Enforce secure CORS and use Anti-CSRF tokens    |
| ⚖️ **Compliance** | Violation of data protection laws     | Audit and restrict cross-origin access strictly |

## Configuration

This rule has no configuration options in the current version.

## Examples

### ❌ Incorrect

```javascript
// Setting wildcard origin using res.setHeader
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // ❌ HIGH RISK
  next();
});

// Using the cors middleware with wildcard origin
const cors = require('cors');
app.use(cors({ origin: '*' })); // ❌ HIGH RISK
```

### ✅ Correct

```javascript
// Specifying a single trusted origin
app.use(cors({ origin: 'https://trusted.example.com' }));

// Using a function to validate against an allowlist
const whiteList = ['https://app.example.com', 'https://admin.example.com'];
const corsOptions = {
  origin: function (origin, callback) {
    if (whiteList.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
app.use(cors(corsOptions));
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Origin Reflection

**Why**: If the server reflects the `Origin` header without validation, it's effectively a wildcard.

```javascript
res.setHeader('Access-Control-Allow-Origin', req.headers.origin); // ❌ NOT DETECTED
```

**Mitigation**: Always validate the `Origin` header against a strict allowlist.

### Environment Variable Wildcards

**Why**: If the origin is loaded from an environment variable that happens to be `*`.

```javascript
app.use(cors({ origin: process.env.ALLOWED_ORIGIN })); // ❌ NOT DETECTED
```

**Mitigation**: Use a configuration system that prevents wildcards in production.

## References

- [CWE-942: Permissive Write of Outbound HTTP Headers](https://cwe.mitre.org/data/definitions/942.html)
- [OWASP CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [MDN - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
