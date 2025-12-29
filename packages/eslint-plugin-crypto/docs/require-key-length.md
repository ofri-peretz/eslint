# require-key-length

Require AES-256 instead of AES-128/192.

## Rule Details

Recommends maximum key strength with minimal performance impact.

**CWE:** [CWE-326](https://cwe.mitre.org/data/definitions/326.html) - Inadequate Encryption Strength

## ❌ Incorrect

```javascript
crypto.createCipheriv('aes-128-gcm', key, iv);
crypto.createCipheriv('aes-192-gcm', key, iv);
```

## ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Options

```json
{
  "crypto/require-key-length": ["error", { "minKeyBits": 256 }]
}
```
