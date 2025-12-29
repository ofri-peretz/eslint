# no-web-crypto-export

Warn on crypto.subtle.exportKey() usage.

## Rule Details

Exporting cryptographic keys increases attack surface.

**CWE:** [CWE-321](https://cwe.mitre.org/data/definitions/321.html)

## ❌ Incorrect

```javascript
const rawKey = await crypto.subtle.exportKey('raw', key);
const jwk = await crypto.subtle.exportKey('jwk', key);
```

## ✅ Correct

```javascript
// Generate non-extractable keys
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  false, // extractable = false
  ['encrypt', 'decrypt'],
);
```
