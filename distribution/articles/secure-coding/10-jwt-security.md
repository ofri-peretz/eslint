---
title: 'JWT Security Anti-Patterns'
published: false
description: "From 'none' algorithm to weak secrets, JWTs are full of security pitfalls. Here's how to avoid them."
tags: javascript, security, jwt, authentication
cover_image:
canonical_url:
---

# JWT Security Anti-Patterns

JSON Web Tokens are everywhere. So are JWT vulnerabilities.

## Anti-Pattern 1: The 'none' Algorithm

```javascript
// ❌ Allowing 'none' algorithm
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256', 'none'], // Never do this
});
```

An attacker crafts a token with `"alg": "none"`, and your verify becomes worthless.

```javascript
// ✅ Explicit algorithm allowlist
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'], // Only what you expect
});
```

## Anti-Pattern 2: Weak Secrets

```javascript
// ❌ Predictable secret
const secret = 'secret123';
const secret = process.env.JWT_SECRET || 'default';
```

Common secrets are in wordlists. Attackers try them first.

```javascript
// ✅ Strong, random secret
const secret = crypto.randomBytes(64).toString('hex');
// Store in secure secret manager, never in code
```

## Anti-Pattern 3: Algorithm Confusion

```javascript
// ❌ Using RS256 but accepting HS256
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256', 'HS256'], // Attack vector!
});
```

An attacker changes the algorithm to HS256 and signs with the PUBLIC key (which you've shared). The verify uses the same public key as the HMAC secret—it matches.

```javascript
// ✅ Only accept the algorithm you use
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'], // Asymmetric only
});
```

## Anti-Pattern 4: No Expiration

```javascript
// ❌ Tokens that never expire
const token = jwt.sign({ userId: 123 }, secret);
// This token is valid forever
```

Stolen token = permanent access.

```javascript
// ✅ Short expiration + refresh tokens
const token = jwt.sign(
  { userId: 123 },
  secret,
  { expiresIn: '15m' }, // 15 minutes
);
```

## Anti-Pattern 5: Trusting Unverified Claims

```javascript
// ❌ Reading claims before verification
const payload = jwt.decode(token); // No signature check!
if (payload.isAdmin) {
  grantAdminAccess();
}
```

`decode` doesn't verify. Anyone can craft any payload.

```javascript
// ✅ Always verify first
const payload = jwt.verify(token, secret);
if (payload.isAdmin) {
  grantAdminAccess();
}
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

JWT anti-patterns are detected:

```bash
src/auth.ts
  12:5  error  🔒 CWE-347 OWASP:A02 CVSS:7.5 | Insecure JWT configuration
               Fix: Remove 'none' from algorithms, use explicit allowlist
```

## JWT Checklist

| Check                           | Required |
| ------------------------------- | -------- |
| Algorithm explicitly specified  | ✅       |
| 'none' algorithm blocked        | ✅       |
| Strong secret (256+ bits)       | ✅       |
| Short expiration                | ✅       |
| Always verify before decode     | ✅       |
| Asymmetric keys for distributed | ✅       |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let JWT misconfigurations become your breach story.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-insecure-jwt](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-jwt.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
