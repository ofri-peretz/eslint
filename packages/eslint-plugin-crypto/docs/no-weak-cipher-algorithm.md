# no-weak-cipher-algorithm

Disallow weak cipher algorithms (DES, 3DES, RC4, Blowfish).

## Rule Details

This rule detects the use of deprecated or broken encryption algorithms.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
crypto.createCipheriv('des', key, iv);
crypto.createCipheriv('des-ede3', key, iv);
crypto.createCipheriv('rc4', key, '');
crypto.createCipheriv('blowfish', key, iv);
```

## ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', key, iv);
crypto.createCipheriv('chacha20-poly1305', key, iv);
```

## Options

```json
{
  "crypto/no-weak-cipher-algorithm": [
    "error",
    {
      "allowInTests": false,
      "additionalWeakCiphers": []
    }
  ]
}
```
