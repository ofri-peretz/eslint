# no-static-iv

Disallow hardcoded initialization vectors (IVs).

## Rule Details

Detects hardcoded or static IVs passed to `createCipheriv`.

**CWE:** [CWE-329](https://cwe.mitre.org/data/definitions/329.html) - Not Using an Unpredictable IV

## ❌ Incorrect

```javascript
const iv = '1234567890123456';
crypto.createCipheriv('aes-256-gcm', key, iv);

crypto.createCipheriv('aes-256-gcm', key, Buffer.from('staticiv1234'));
```

## ✅ Correct

```javascript
const iv = crypto.randomBytes(16);
crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Why This Matters

Static IVs make encryption deterministic. Identical plaintexts produce identical ciphertexts, allowing pattern detection.
