---
title: require-secure-credential-storage
description: 'require-secure-credential-storage'
category: security
tags: ['security', 'node']
---


> Enforces secure storage patterns for credentials

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
// Encrypted localStorage (browser)
import { encrypt } from './crypto';

const encryptedToken = await encrypt(user.token, encryptionKey);
localStorage.setItem('authToken', encryptedToken); // ✅ Encrypted before storage

// Encrypted file storage (Node.js)
import fs from 'fs';
import crypto from 'crypto';

const encryptData = (data: string, key: Buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

const encrypted = encryptData(JSON.stringify(credentials), encryptionKey);
fs.writeFileSync('credentials.enc', encrypted); // ✅ AES-256-GCM encrypted

// Mobile platform secure storage
// iOS: Keychain Services
await Keychain.setGenericPassword(username, password); // ✅ iOS Keychain

// Android: EncryptedSharedPreferences
import EncryptedStorage from 'react-native-encrypted-storage';
await EncryptedStorage.setItem(
  'credentials',
  JSON.stringify({
    username,
    password,
  }),
); // ✅ Android hardware-backed encryption

// Never store passwords - use tokens
// Server issues short-lived tokens, not passwords
const authToken = await login(username, password);
const encryptedToken = await encrypt(authToken);
localStorage.setItem('token', encryptedToken); // ✅ Token, not password
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Encryption via Wrapper Functions

**Why**: We only detect direct `setItem()` and `writeFile()` calls. If encryption happens in a wrapper function, we can't verify it.

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
