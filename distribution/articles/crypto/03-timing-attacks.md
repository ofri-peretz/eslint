---
title: 'Timing Attacks: Why String Comparison is Dangerous'
published: false
description: 'Comparing secrets with === leaks information. Here is how timing attacks work and how to prevent them.'
tags: security, cryptography, nodejs, eslint
cover_image:
series: Cryptography Security
---

# Timing Attacks: Why String Comparison is Dangerous

```javascript
if (userToken === expectedToken) {
  // Authorized
}
```

This comparison **leaks information**.

## How Timing Attacks Work

### Normal String Comparison

```javascript
'abcdef' === 'abcdef'; // Compare char by char
'abcdef' === 'xbcdef'; // Fail at position 0 (fast)
'abcdef' === 'axcdef'; // Fail at position 1 (slower)
'abcdef' === 'abxdef'; // Fail at position 2 (even slower)
```

The more characters match, the longer it takes.

### The Attack

```javascript
// Attacker tries tokens:
tryToken('aaaaa...'); // Fast rejection (0 matches)
tryToken('baaaa...'); // Fast rejection (0 matches)
tryToken('xaaaa...'); // Slightly slower! First char is 'x'

// Now attacker knows first char
tryToken('xaaaa...'); // Fast rejection
tryToken('xbaaa...'); // Fast rejection
tryToken('xyaaa...'); // Slower! Second char is 'y'

// Character by character, attacker recovers entire token
```

## Real-World Impact

| Target          | Attack            | Impact              |
| --------------- | ----------------- | ------------------- |
| API keys        | Key recovery      | Full account access |
| Session tokens  | Session hijacking | User impersonation  |
| HMAC signatures | Signature forgery | Data tampering      |
| Password hashes | Hash recovery     | Password cracking   |

## The Vulnerable Code

```javascript
// ❌ All of these are vulnerable
if (userToken === storedToken) {
}
if (hash == expectedHash) {
}
if (signature === computedSignature) {
}
if (apiKey.equals(storedKey)) {
}
```

## The Fix: Constant-Time Comparison

```javascript
import { timingSafeEqual } from 'crypto';

// ✅ Constant time - same duration regardless of match position
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false; // Different lengths - use default comparison
  }

  return timingSafeEqual(
    Buffer.from(a),
    Buffer.from(b)
  );
}

// Usage
if (safeCompare(userToken, expectedToken)) {
  // Authorized
}
```

## How timingSafeEqual Works

```javascript
// Internally, it compares ALL bytes regardless of matches:
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]; // XOR each byte
  }
  return result === 0;
}
// Same execution time whether 0 or all bytes match
```

## Common Patterns

### Password Verification

```javascript
// ❌ Dangerous
if (bcrypt.hashSync(password) === storedHash) {
}

// ✅ Safe (bcrypt.compare is constant-time internally)
if (await bcrypt.compare(password, storedHash)) {
}
```

### HMAC Verification

```javascript
// ❌ Dangerous
const computed = createHmac('sha256', secret).update(data).digest('hex');
if (computed === providedSignature) {
}

// ✅ Safe
import { timingSafeEqual } from 'crypto';

const computed = createHmac('sha256', secret).update(data).digest();
const provided = Buffer.from(providedSignature, 'hex');

if (
  computed.length === provided.length &&
  timingSafeEqual(computed, provided)
) {
  // Valid signature
}
```

### Token Comparison

```javascript
// ❌ Dangerous
if (req.headers.authorization === `Bearer ${expectedToken}`) {
}

// ✅ Safe
const authHeader = req.headers.authorization || '';
const [bearer, token] = authHeader.split(' ');

if (bearer === 'Bearer' && safeCompare(token, expectedToken)) {
}
```

## ESLint Rules

```javascript
// eslint.config.js
import cryptoPlugin from 'eslint-plugin-crypto';

export default [
  {
    rules: {
      'crypto/no-timing-unsafe-compare': 'error',
    },
  },
];
```

### Detection Patterns

The rule detects:

- `===` comparison of variables named `token`, `secret`, `hash`, `signature`, `key`
- `==` comparison of crypto-related values
- String methods like `.equals()` on sensitive values

### Error Output

```bash
src/auth.ts
  28:5  error  🔒 CWE-208 CVSS:5.9 | Timing-unsafe comparison of secret
               Risk: Timing attacks can recover secret values
               Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
```

## Length Check Important

```javascript
// ✅ Always check length first
function safeCompare(a: string, b: string): boolean {
  // If lengths differ, we reveal that - but only length, not content
  // This is acceptable for most use cases
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-crypto %}
📦 npm install eslint-plugin-crypto
{% endcta %}

```javascript
import cryptoPlugin from 'eslint-plugin-crypto';
export default [cryptoPlugin.configs.recommended];
```

---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)
📖 [Rule: no-timing-unsafe-compare](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto/docs/rules/no-timing-unsafe-compare.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How do you compare secrets in your code?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
