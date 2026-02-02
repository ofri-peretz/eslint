---
title: require-storage-encryption
description: "CWE: [CWE-312](https://cwe.mitre.org/data/definitions/312.html)"
tags: ['security', 'node']
category: security
severity: medium
cwe: CWE-312
autofix: false
---

> **Keywords:** require-storage-encryption, data at rest, encryption, persistent storage, security, ESLint rule, CWE-312
> **CWE:** [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)  
> **OWASP Mobile:** [OWASP Mobile Top 10 M2: Insecure Data Storage](https://owasp.org/www-project-mobile-top-10/)


<!-- @rule-summary -->
CWE: [CWE-312](https://cwe.mitre.org/data/definitions/312.html)
<!-- @/rule-summary -->

ESLint Rule: require-storage-encryption. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security).

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | High (Data at Rest Exposure)            |
| **Auto-Fix**   | ❌ No (requires encryption logic)       |
| **Category**   | Security |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | Applications storing PII or tokens      |

## Vulnerability and Risk

**Vulnerability:** Cleartext storage of sensitive information occurs when data is written to persistent storage (files, databases, local storage) without being encrypted first.

**Risk:** If the storage medium is compromised (e.g., stolen device, unauthorized file access, backup leak), attackers can read sensitive data like passwords, session tokens, or PII directly.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-312 OWASP:M2 | Missing Storage Encryption detected | HIGH [DataAtRest]
   Fix: Wrap sensitive data in an encryption function before calling setItem/writeFile | https://cwe.mitre.org/data/definitions/312.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                             |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-312](https://cwe.mitre.org/data/definitions/312.html) [OWASP:M2](https://owasp.org/www-project-mobile-top-10/) |
| **Issue Description**     | Specific vulnerability | `Missing Storage Encryption detected`                                                                               |
| **Severity & Compliance** | Impact assessment      | `HIGH [DataAtRest]`                                                                                                 |
| **Fix Instruction**       | Actionable remediation | `Wrap data in an encryption function`                                                                               |
| **Technical Truth**       | Official reference     | [Cleartext Storage](https://cwe.mitre.org/data/definitions/312.html)                                                |

## Rule Details

This rule flags calls to `setItem` (localStorage/sessionStorage) and `writeFile` (fs) that do not appear to use an encryption wrapper for their input data.

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
    A[Storage Call Detected] --> B{Arguments encrypted?}
    B -->|Yes| C[✅ Securely Stored]
    B -->|No| D[🚨 Cleartext Storage Risk]
    D --> E[💡 Suggest encrypt() wrapper]
```

### Why This Matters

| Issue                | Impact                                 | Solution                                                |
| -------------------- | -------------------------------------- | ------------------------------------------------------- |
| 🕵️ **Data Exposure** | Physical access leads to data leak     | Encrypt data before writing to disk                     |
| 🚀 **Exfiltration**  | Stored tokens can be stolen and reused | Use authenticated encryption (AES-GCM)                  |
| 🔒 **Compliance**    | Failure to meet GDPR/SOC2 requirements | Implement encryption at rest for all sensitive datasets |

## Configuration

This rule has no configuration options in the current version.

## Examples

### ❌ Incorrect

```javascript
// Writing sensitive data to a file without encryption
fs.writeFile('user_data.json', JSON.stringify(userData));

// Storing a token in localStorage in cleartext
localStorage.setItem('session_token', token);
```

### ✅ Correct

```javascript
// Encrypting data before writing to a file
const encryptedData = encrypt(JSON.stringify(userData), secretKey);
fs.writeFile('user_data.json', encryptedData);

// Encrypting a token before storage
localStorage.setItem('session_token', encrypt(token));
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Custom Storage Methods

**Why**: This rule specifically looks for `setItem` and `writeFile`. Custom wrappers or database `save()` methods are not analyzed.

**Mitigation**: Standardize on a few secure storage utilities and audit them centrally.

### Weak Encryption

**Why**: This rule only checks for the _presence_ of a function call containing "encrypt". It does not verify the strength of the algorithm used.

**Mitigation**: Use a trusted crypto library and follow the [Node Security Crypto Standard](../../../crypto/docs/standards.md).

## References

- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [OWASP Secure Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Storage_Cheat_Sheet.html)