# no-predictable-salt

Disallow empty, short, or hardcoded salts.

## Rule Details

Detects weak salts in key derivation functions.

**CWE:** [CWE-331](https://cwe.mitre.org/data/definitions/331.html) - Insufficient Entropy

## ❌ Incorrect

```javascript
crypto.pbkdf2(password, '', 100000, 32, 'sha256', cb);
crypto.pbkdf2(password, 'salt', 100000, 32, 'sha256', cb);
crypto.scrypt(password, Buffer.alloc(8), 32, cb);
```

## ✅ Correct

```javascript
const salt = crypto.randomBytes(16);
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', cb);
```

## Options

```json
{
  "crypto/no-predictable-salt": ["error", { "minSaltLength": 16 }]
}
```
