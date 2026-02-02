---
title: no-hardcoded-crypto-key
description: "CWE: [CWE-321](https://cwe.mitre.org/data/definitions/321.html)"
tags: ['security', 'crypto']
category: security
severity: critical
cwe: CWE-321
owasp: "A02:2021"
autofix: false
---

> **Keywords:** no-hardcoded-crypto-key, secrets management, KMS, environment variables, security, ESLint rule, CWE-321, key disclosure
> **CWE:** [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)  
> **OWASP:** [OWASP Top 10 A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
CWE: [CWE-321](https://cwe.mitre.org/data/definitions/321.html)
<!-- @/rule-summary -->

ESLint Rule: no-hardcoded-crypto-key. This rule is part of [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto).

## Quick Summary

| Aspect         | Details                                   |
| -------------- | ----------------------------------------- |
| **Severity**   | Critical (Secret Leakage)                 |
| **Auto-Fix**   | ❌ No (requires secrets migration)        |
| **Category**   | Security |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration   |
| **Best For**   | All applications handling encryption keys |

## Vulnerability and Risk

**Vulnerability:** Embedding raw cryptographic keys directly in the source code as string literals or static buffers.

**Risk:** Hardcoded keys are permanent "backdoors" into your application's security. They are checked into version control (git), leaked in build artifacts, and become visible to anyone with read access to the repository or the deployed code. Revoking a hardcoded key requires a code deployment, which is slow and leaves past backups/versions vulnerable forever.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-321 OWASP:A02 | Hardcoded Cryptographic Key detected | CRITICAL [SecretLeak]
   Fix: Move the key to a secure vault (KMS/Secrets Manager) or use environment variables | https://cwe.mitre.org/data/definitions/321.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                   |
| :------------------------ | :--------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Risk Standards**        | Security benchmarks    | [CWE-321](https://cwe.mitre.org/data/definitions/321.html) [OWASP:A02](https://owasp.org/Top10/A02_2021/) |
| **Issue Description**     | Specific vulnerability | `Hardcoded Key detected`                                                                                  |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [SecretLeak]`                                                                                   |
| **Fix Instruction**       | Actionable remediation | `Move to secure vault/KMS`                                                                                |
| **Technical Truth**       | Official reference     | [Use of Hard-coded Key](https://cwe.mitre.org/data/definitions/321.html)                                  |

## Rule Details

This rule identifies string literals or static `Buffer.from()` calls being passed into the `key` argument of `crypto.createCipheriv()` and `crypto.createDecipheriv()`.

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
    A[crypto Method Call] --> B{Key argument is a literal string?}
    B -->|Yes| C[🚨 High Secret Exposure]
    B -->|No| D{Key is Buffer.from('literal')?}
    D -->|Yes| C
    D -->|No| E[✅ Likely Protected]
    C --> F[💡 Suggest process.env or AWS KMS]
```

### Why This Matters

| Issue                   | Impact                               | Solution                                                      |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------- |
| 🛡️ **Git Exposure**     | Key leaked to entire dev team/actors | Use `.env` or CI/CD secrets that aren't committed to the repo |
| 🚀 **Ineffective Rev.** | Rotation requires code redeploy      | Use dynamic key loading from a vault for instant rotation     |
| 🔒 **Compliance**       | Violates SOC2/PCI-DSS/HIPAA          | Enforce KMS (AWS/GCP/Azure) for all cryptographic material    |

## Configuration

This rule has no options.

## Examples

### ❌ Incorrect

```javascript
// Hardcoded string as key (DANGEROUS)
const cipher = crypto.createCipheriv(
  'aes-256-gcm',
  'very-secret-hardcoded-key-123',
  iv,
);

// Hardcoded buffer literal
const key = Buffer.from('my-static-key-value');
const dc = crypto.createDecipheriv('aes-256-cbc', key, iv);
```

### ✅ Correct

```javascript
// Loading key from process environment
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// Using a KMS client
const keyFromVault = await secretsManager.getKey('app-master-key');
const dc = crypto.createDecipheriv('aes-256-gcm', keyFromVault, iv);
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Imported Constants

**Why**: If the key is imported from another file as a variable, this rule (which processes one file at a time) doesn't know it's hardcoded.

```javascript
import { KEY } from './config';
crypto.createCipheriv(algo, KEY, iv); // ❌ NOT DETECTED
```

**Mitigation**: Run security scans across the whole codebase and hunt for string literals in `config` or `constants` modules.

### Concatenated Literals

**Why**: If the key is built using `const key = 'part1' + 'part2'`, it may skip basic literal detection.

**Mitigation**: Avoid building secrets via string manipulation; load them as single atoms from your vault.

## References

- [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Twelve-Factor App - Config](https://12factor.net/config)