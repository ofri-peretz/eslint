# no-ecb-mode

Disallow ECB encryption mode.

## Rule Details

ECB mode encrypts each block independently, leaking data patterns.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
crypto.createCipheriv('aes-256-ecb', key, null);
crypto.createCipheriv('aes-128-ecb', key, null);
```

## ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', key, iv);
crypto.createCipheriv('aes-256-cbc', key, iv);
```

## Visual Proof

The famous ECB penguin demonstrates how ECB leaks patterns - encrypting an image with ECB still reveals the penguin shape because identical blocks encrypt to identical ciphertext.
