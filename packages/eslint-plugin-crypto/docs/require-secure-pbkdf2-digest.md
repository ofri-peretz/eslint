# require-secure-pbkdf2-digest

Require secure digest algorithm for PBKDF2 (not SHA1).

## Rule Details

Detects PBKDF2 using weak hash algorithms like SHA1.

**CVE:** [CVE-2023-46233](https://nvd.nist.gov/vuln/detail/CVE-2023-46233) - crypto-js uses SHA1 default  
**CWE:** [CWE-328](https://cwe.mitre.org/data/definitions/328.html)

## ❌ Incorrect

```javascript
crypto.pbkdf2(password, salt, 100000, 32, 'sha1', callback);
CryptoJS.PBKDF2(password, salt); // Uses SHA1 by default
```

## ✅ Correct

```javascript
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', callback);
crypto.pbkdf2(password, salt, 100000, 64, 'sha512', callback);
```

## Options

```json
{
  "crypto/require-secure-pbkdf2-digest": [
    "error",
    {
      "allowedDigests": ["sha256", "sha384", "sha512"]
    }
  ]
}
```
