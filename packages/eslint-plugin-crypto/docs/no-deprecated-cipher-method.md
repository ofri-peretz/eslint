# no-deprecated-cipher-method

Disallow deprecated createCipher() and createDecipher().

## Rule Details

`createCipher()` is deprecated because it derives keys insecurely without IV.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
const cipher = crypto.createCipher('aes-256-cbc', password);
const decipher = crypto.createDecipher('aes-256-cbc', password);
```

## ✅ Correct

```javascript
const key = crypto.scryptSync(password, salt, 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Why Deprecated

`createCipher` uses OpenSSL's EVP_BytesToKey with MD5, which:

- Has no salt
- Uses only 1 iteration
- Uses weak MD5
