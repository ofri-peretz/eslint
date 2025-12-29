# no-insecure-rsa-padding

Disallow RSA PKCS#1 v1.5 padding (vulnerable to Marvin Attack).

## Rule Details

This rule detects RSA operations using PKCS#1 v1.5 padding, which is vulnerable to the Marvin Attack (CVE-2023-46809).

**CVE:** [CVE-2023-46809](https://nvd.nist.gov/vuln/detail/CVE-2023-46809)  
**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  },
  buffer,
);
```

## ✅ Correct

```javascript
crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  },
  buffer,
);
```

## Background

The Marvin Attack is a timing side-channel vulnerability that affects RSA decryption with PKCS#1 v1.5 padding. An attacker can measure decryption time to gradually recover the plaintext.

## Options

```json
{
  "crypto/no-insecure-rsa-padding": [
    "error",
    {
      "allowInTests": false
    }
  ]
}
```
