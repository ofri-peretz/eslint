---
title: require-secure-credential-storage
description: This rule detects a credential written to localStorage, sessionStorage or AsyncStorage without encryption
tags: ['security', 'node']
category: security
severity: high
cwe: CWE-312
autofix: false
---

> Enforces secure storage patterns for credentials


<!-- @rule-summary -->
This rule detects a credential written to localStorage, sessionStorage or AsyncStorage without encryption
<!-- @/rule-summary -->

**Severity:** 🔴 CRITICAL  
**CWE:** [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)  
**OWASP Mobile:** [M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects when credentials are stored using `localStorage.setItem()` or `fs.writeFile()` without encryption. Insecure credential storage (plaintext, weak encryption) leads to credential theft if the device is compromised or local storage is accessed.

### Why This Matters

Stored credentials must be encrypted to prevent theft:

- **Device theft**: Attackers access unencrypted storage on stolen devices
- **Malware**: Keyloggers or storage scanners extract plaintext credentials
- **Forensics**: Deleted plaintext files can be recovered
- **Compliance**: GDPR/PCI-DSS require encryption for stored credentials

## ❌ Incorrect

```typescript
// Plaintext localStorage (browser)
localStorage.setItem('authToken', user.token); // ❌ Unencrypted

// Plaintext file storage (Node.js)
import fs from 'fs';
fs.writeFile(
  'credentials.json',
  JSON.stringify({
    username: user.username,
    password: user.password, // ❌ Plaintext password!
  }),
);

// Base64 encoding (NOT encryption!)
const encoded = btoa(JSON.stringify(credentials));
localStorage.setItem('creds', encoded); // ❌ Still plaintext, just encoded

// Weak "encryption" with reversible encoding
const obfuscated = rot13(password);
fs.writeFileSync('pass.txt', obfuscated); // ❌ Trivially reversible
```

## ✅ Correct

```typescript
const x = 42;
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Encryption via Wrapper Functions

**Why**: We only detect a direct `setItem()` call whose VALUE argument is an encryption call. If encryption happens inside a wrapper function, we cannot verify it.

```typescript
// ❌ NOT DETECTED - Wrapper may or may not encrypt
function saveCredentials(creds: Credentials) {
  localStorage.setItem('creds', JSON.stringify(creds)); // Actually unencrypted!
}
saveCredentials({ username, password });
```

**Mitigation**: Document encryption requirements for wrapper functions. Use TypeScript branded types for encrypted data.

### Weak or Broken Encryption

**Why**: We only check for the presence of `encrypt()` in the call chain. We can't verify encryption strength.

```typescript
// ❌ NOT DETECTED - Weak encryption
const weakEncrypted = xorEncrypt(password, 'key'); // XOR is broken
localStorage.setItem('pass', weakEncrypted);
```

**Mitigation**: Use vetted encryption libraries (SubtleCrypto, Node crypto). Enforce AES-256-GCM minimum.

### SessionStorage vs LocalStorage

**Why**: We only check `localStorage`. `sessionStorage` and `IndexedDB` are not analyzed.

```typescript
// ❌ NOT DETECTED - sessionStorage
sessionStorage.setItem('token', authToken); // Still unencrypted!
```

**Mitigation**: Apply encryption requirement to all browser storage APIs. Use Content Security Policy.

## ⚙️ Configuration

This rule has no configuration options. It requires `encrypt()` wrapper for all `setItem()` and `writeFile()` calls.

## 🔗 Related Rules

- [`no-hardcoded-credentials`](./no-hardcoded-credentials.md) - Prevent hardcoded passwords
- [`require-storage-encryption`](./require-storage-encryption.md) - General storage encryption

## 📚 References

- [CWE-312: Cleartext Storage](https://cwe.mitre.org/data/definitions/312.html)
- [OWASP Mobile M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

## Not a finding

This rule owns **client persistent storage** — `localStorage`, `sessionStorage` and React
Native's `AsyncStorage`, all of which keep what you give them in the clear. Writes to disk
belong to [`require-storage-encryption`](./require-storage-encryption.md).

| Code | Why it is silent |
| --- | --- |
| `localStorage.setItem('theme', 'dark')` | A store, but nothing says a credential is going into it. |
| `localStorage.setItem('authToken', encrypt(token))` | Encrypted on the way in. |
| `cache.setItem('password', pwd)` | `setItem` on something that is not a persistent store. |
| `localStorage.setItem('key', publicKey)` | `key` alone is not evidence — it matches `keyboard`, `keyCode`, `objectKey`. |

**If it fires**, the key or the value named a credential. Note that an *encrypt-looking
variable* is not proof: `setItem('authToken', encrypted)` still reports, because nothing
in the file shows anything encrypted it. Wrap the value in the encryption call and the
rule goes quiet.
