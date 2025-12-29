# require-random-iv

Require IV from cryptographically secure source.

## Rule Details

Ensures IVs are generated using `crypto.randomBytes()` or similar CSPRNG.

**CWE:** [CWE-329](https://cwe.mitre.org/data/definitions/329.html)

## ❌ Incorrect

```javascript
const iv = Buffer.alloc(16); // Zero-filled
const iv = Buffer.from('1234567890123456');
```

## ✅ Correct

```javascript
const iv = crypto.randomBytes(16);
const iv = crypto.randomBytes(12); // For GCM
```

## Options

```json
{
  "crypto/require-random-iv": [
    "error",
    {
      "allowedSources": ["randomBytes", "getRandomValues", "randomFillSync"]
    }
  ]
}
```
