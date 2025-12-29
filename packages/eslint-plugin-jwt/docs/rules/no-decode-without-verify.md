# no-decode-without-verify

> Disallow trusting decoded JWT payload without signature verification

**Severity:** 🟠 High  
**CWE:** [CWE-345](https://cwe.mitre.org/data/definitions/345.html)

## Rule Details

This rule detects usage of `jwt.decode()` or the `jwt-decode` library. Decoded JWTs can be tampered with by attackers since `decode()` never verifies the signature.

## Examples

### ❌ Incorrect

```javascript
// jwt.decode() returns unverified data
const payload = jwt.decode(token);
const userId = jwt.decode(token).sub;

// jwt-decode library
import jwtDecode from 'jwt-decode';
const claims = jwtDecode(token);
```

### ✅ Correct

```javascript
// jwt.verify() validates signature
const payload = jwt.verify(token, secret);
const { sub } = jwt.verify(token, secret, { algorithms: ['RS256'] });

// jose library with verification
import { jwtVerify } from 'jose';
const { payload } = await jwtVerify(token, key);
```

## Options

```javascript
{
  "jwt/no-decode-without-verify": ["error", {
    "allowHeaderInspection": false,
    "trustedAnnotations": ["@decoded-header-only", "@verified-separately"]
  }]
}
```

## When Not To Use It

Use `@decoded-header-only` annotation when inspecting token headers before verification routing.

## Further Reading

- [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
