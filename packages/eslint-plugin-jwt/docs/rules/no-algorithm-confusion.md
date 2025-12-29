# no-algorithm-confusion

> Prevent algorithm confusion attacks using symmetric algorithms with asymmetric keys

**Severity:** 🔴 Critical  
**CWE:** [CWE-347](https://cwe.mitre.org/data/definitions/347.html)

## Rule Details

This rule detects algorithm confusion attacks where symmetric algorithms (HS256, HS384, HS512) are used with asymmetric keys (public keys). An attacker can use the public key as an HMAC secret to forge tokens.

## Examples

### ❌ Incorrect

```javascript
// HS256 with public key - VULNERABLE
jwt.verify(token, publicKey, { algorithms: ['HS256'] });

// Any symmetric algorithm with public key
jwt.verify(token, getPublicKey(), { algorithms: ['HS384'] });
jwt.verify(token, jwksKey, { algorithms: ['HS512'] });
```

### ✅ Correct

```javascript
// Asymmetric algorithm with public key - SAFE
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
jwt.verify(token, publicKey, { algorithms: ['ES256'] });

// Symmetric algorithm with shared secret - SAFE
jwt.verify(token, sharedSecret, { algorithms: ['HS256'] });
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
```

## How the Attack Works

1. Server uses RS256 (asymmetric) with a public/private key pair
2. Attacker obtains the public key (often publicly available)
3. Attacker creates a token with `alg: "HS256"` signed with the public key as secret
4. Server accepts HS256 in its algorithm list
5. Server verifies using the public key as HMAC secret - attack succeeds

## When Not To Use It

Never disable this rule. Algorithm confusion is a critical vulnerability.

## Further Reading

- [PortSwigger - Algorithm Confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [Auth0 - Critical JWT Vulnerabilities](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
