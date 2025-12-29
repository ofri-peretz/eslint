# no-key-reuse

Warn when same key is used for multiple cipher operations.

## Rule Details

Detects key reuse across multiple cipher calls.

**CWE:** [CWE-323](https://cwe.mitre.org/data/definitions/323.html) - Reusing a Nonce, Key Pair

## ❌ Incorrect

```javascript
const cipher1 = crypto.createCipheriv('aes-256-gcm', key, iv1);
const cipher2 = crypto.createCipheriv('aes-256-gcm', key, iv2); // Same key!
```

## ✅ Correct

```javascript
// Derive separate keys using HKDF
const encryptionKey = crypto.hkdfSync('sha256', masterKey, salt, 'encrypt', 32);
const signingKey = crypto.hkdfSync('sha256', masterKey, salt, 'sign', 32);
```

## Why This Matters

Key reuse with the same IV or predictable IVs enables cryptanalysis.
