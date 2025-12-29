# no-sha1-hash

Disallow sha1() from crypto-hash package.

**CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)

## ❌ Incorrect

```javascript
import { sha1 } from 'crypto-hash';
const hash = await sha1(data);
```

## ✅ Correct

```javascript
import { sha256, sha512 } from 'crypto-hash';
const hash = await sha256(data);
```
