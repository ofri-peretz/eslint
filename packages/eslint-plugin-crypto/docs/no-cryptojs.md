# no-cryptojs

Warn on deprecated crypto-js library usage.

**CWE:** [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)

## ❌ Incorrect

```javascript
import CryptoJS from 'crypto-js';
const CryptoJS = require('crypto-js');
```

## ✅ Correct

```javascript
import crypto from 'node:crypto';
// Or use Web Crypto API
```
