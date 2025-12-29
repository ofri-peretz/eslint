# no-numeric-only-tokens

Warn on type: 'numeric' for security tokens.

**CWE:** [CWE-330](https://cwe.mitre.org/data/definitions/330.html)

## ❌ Incorrect

```javascript
cryptoRandomString({ length: 32, type: 'numeric' });
```

## ✅ Correct

```javascript
cryptoRandomString({ length: 32, type: 'alphanumeric' });
cryptoRandomString({ length: 32, type: 'url-safe' });
```
