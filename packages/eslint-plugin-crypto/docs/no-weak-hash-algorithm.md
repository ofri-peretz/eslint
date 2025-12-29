# no-weak-hash-algorithm

Disallow weak hash algorithms (MD5, SHA1, MD4, RIPEMD).

## Rule Details

This rule detects the use of cryptographically weak hash algorithms that are vulnerable to collision attacks.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html) - Use of a Broken or Risky Cryptographic Algorithm

## ❌ Incorrect

```javascript
crypto.createHash('md5').update(data).digest('hex');
crypto.createHash('sha1').update(data).digest('hex');
crypto.createHash('md4').update(data).digest('hex');
```

## ✅ Correct

```javascript
crypto.createHash('sha256').update(data).digest('hex');
crypto.createHash('sha512').update(data).digest('hex');
crypto.createHash('sha3-256').update(data).digest('hex');
```

## Options

```json
{
  "crypto/no-weak-hash-algorithm": [
    "error",
    {
      "allowInTests": false,
      "additionalWeakAlgorithms": []
    }
  ]
}
```

| Option                     | Type     | Default | Description                     |
| -------------------------- | -------- | ------- | ------------------------------- |
| `allowInTests`             | boolean  | `false` | Allow weak hashes in test files |
| `additionalWeakAlgorithms` | string[] | `[]`    | Additional algorithms to flag   |

## When Not To Use

When checksums are used for non-security purposes (e.g., cache invalidation) and you accept the `allowInTests` option for test files.
