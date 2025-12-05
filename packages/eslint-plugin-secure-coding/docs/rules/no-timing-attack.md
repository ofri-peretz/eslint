# no-timing-attack

> **Keywords:** timing attack, CWE-208, side-channel, authentication, security, constant-time

Detects timing attack vulnerabilities in authentication code. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-208 (Observable Timing Discrepancy) |
| **Severity** | Medium (CVSS 5.9) |
| **Auto-Fix** | 🔧 Auto-fixable |
| **Category** | Cryptography |

## Rule Details

Timing attacks exploit the time it takes for operations to complete to leak sensitive information. In authentication code, attackers can use timing differences to:
- Guess passwords character by character
- Discover valid usernames or tokens
- Bypass authentication mechanisms
- Extract cryptographic keys

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Password Guessing** | Account compromise | Use constant-time comparison |
| 🔍 **Username Enumeration** | Information disclosure | Consistent response times |
| 🔑 **Token Discovery** | Session hijacking | Use crypto.timingSafeEqual |

## Examples

### ❌ Incorrect

```typescript
// Standard string comparison (vulnerable)
if (userPassword === storedPassword) {
  return true;
}

// Early return on first mismatch
function verifyToken(provided: string, expected: string) {
  for (let i = 0; i < provided.length; i++) {
    if (provided[i] !== expected[i]) {
      return false; // Timing leak!
    }
  }
  return true;
}

// Length comparison reveals information
if (token.length !== expectedToken.length) {
  return false;
}
```

### ✅ Correct

```typescript
// Use crypto.timingSafeEqual
import { timingSafeEqual } from 'crypto';

function verifyPassword(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  
  // Ensure same length before comparison
  if (providedBuf.length !== expectedBuf.length) {
    // Still do comparison to maintain constant time
    return timingSafeEqual(providedBuf, providedBuf) && false;
  }
  
  return timingSafeEqual(providedBuf, expectedBuf);
}

// Or use scrypt/bcrypt for passwords (inherently timing-safe)
import bcrypt from 'bcrypt';
const isValid = await bcrypt.compare(userPassword, storedHash);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-timing-attack': ['error', {
      authFunctions: ['verify', 'authenticate', 'login', 'checkPassword'],
      sensitiveVariables: ['password', 'token', 'secret', 'key', 'hash'],
      allowEarlyReturns: false
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `authFunctions` | `string[]` | `['verify', 'authenticate']` | Authentication function names |
| `sensitiveVariables` | `string[]` | `['password', 'token', 'secret']` | Sensitive variable patterns |
| `allowEarlyReturns` | `boolean` | `false` | Allow early returns in non-sensitive contexts |

## Error Message Format

```
🔒 CWE-208 OWASP:A02-Crypto CVSS:5.9 | Timing Attack Vulnerability | MEDIUM [SOC2,PCI-DSS]
   Fix: Use crypto.timingSafeEqual() for comparing secrets | https://nodejs.org/api/crypto.html
```

## Further Reading

- **[Node.js timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)** - Official documentation
- **[CWE-208](https://cwe.mitre.org/data/definitions/208.html)** - Observable timing discrepancy
- **[Timing Attacks Explained](https://en.wikipedia.org/wiki/Timing_attack)** - Wikipedia

## Related Rules

- [`no-insecure-comparison`](./no-insecure-comparison.md) - Insecure string comparison
- [`no-weak-crypto`](./no-weak-crypto.md) - Weak cryptographic algorithms

