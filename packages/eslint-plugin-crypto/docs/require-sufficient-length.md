# require-sufficient-length

Require crypto-random-string tokens ≥32 characters.

**CWE:** [CWE-330](https://cwe.mitre.org/data/definitions/330.html)

## ❌ Incorrect

```javascript
cryptoRandomString({ length: 8 });
cryptoRandomString({ length: 16 });
```

## ✅ Correct

```javascript
cryptoRandomString({ length: 32 });
cryptoRandomString({ length: 64, type: 'alphanumeric' });
```

## Options

```json
{ "crypto/require-sufficient-length": ["error", { "minLength": 32 }] }
```
