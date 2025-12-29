# no-hardcoded-crypto-key

Disallow hardcoded encryption keys.

## Rule Details

Detects literal encryption keys in `createCipheriv` calls.

**CWE:** [CWE-321](https://cwe.mitre.org/data/definitions/321.html) - Use of Hard-coded Cryptographic Key

## ❌ Incorrect

```javascript
crypto.createCipheriv('aes-256-gcm', 'my-secret-key-123', iv);
crypto.createCipheriv('aes-256-gcm', Buffer.from('hardcoded'), iv);
```

## ✅ Correct

```javascript
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Options

```json
{
  "crypto/no-hardcoded-crypto-key": ["error", { "allowInTests": false }]
}
```
