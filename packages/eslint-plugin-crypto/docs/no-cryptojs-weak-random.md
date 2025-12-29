# no-cryptojs-weak-random

Detect CVE-2020-36732 weak random in crypto-js < 3.2.1.

**CVE:** [CVE-2020-36732](https://nvd.nist.gov/vuln/detail/CVE-2020-36732)  
**CWE:** [CWE-338](https://cwe.mitre.org/data/definitions/338.html)

## ❌ Incorrect

```javascript
CryptoJS.lib.WordArray.random(16);
```

## ✅ Correct

```javascript
crypto.randomBytes(16);
```
