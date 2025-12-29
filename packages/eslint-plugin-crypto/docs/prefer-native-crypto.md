# prefer-native-crypto

Suggest native crypto over third-party libraries.

**CWE:** [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)

## ❌ Incorrect

```javascript
import CryptoJS from 'crypto-js';
import sjcl from 'sjcl';
import forge from 'node-forge';
```

## ✅ Correct

```javascript
import crypto from 'node:crypto';
// Use crypto.subtle for browser
```
