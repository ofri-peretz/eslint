# require-authenticated-encryption

Require authenticated encryption (GCM) instead of CBC.

## Rule Details

Flags CBC/CTR/CFB/OFB modes which don't provide authentication.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
crypto.createCipheriv('aes-256-cbc', key, iv);
crypto.createCipheriv('aes-256-ctr', key, iv);
```

## ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', key, iv);
crypto.createCipheriv('chacha20-poly1305', key, iv);
// Or: CBC + HMAC (Encrypt-then-MAC)
```

## Why This Matters

Without authentication, attackers can modify ciphertext undetected, enabling:

- Padding oracle attacks
- Bit-flipping attacks
- Malleability attacks
