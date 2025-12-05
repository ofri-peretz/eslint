# no-weak-password-recovery

> **Keywords:** password recovery, CWE-640, password reset, account takeover, security, rate limiting

Detects weak password recovery mechanisms. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-640 (Weak Password Recovery) |
| **Severity** | Critical (CVSS 9.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Authentication & Authorization |

## Rule Details

Weak password recovery mechanisms can allow attackers to:
- Reset passwords for other users
- Gain unauthorized account access
- Perform account takeover attacks
- Enumerate valid user accounts

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Account Takeover** | Full account compromise | Use cryptographic tokens |
| 📧 **Token Theft** | Password reset hijacking | Implement expiration |
| 🔄 **Brute Force** | Token guessing | Add rate limiting |

## Examples

### ❌ Incorrect

```typescript
// Predictable recovery token
const token = Date.now().toString();
await sendResetEmail(email, token);

// No token expiration
const resetToken = generateToken();
db.save({ email, token: resetToken });
// Token valid forever!

// Missing rate limiting
app.post('/reset-password', async (req, res) => {
  await sendResetEmail(req.body.email);
  res.send('Email sent');
});

// Weak token entropy
const token = Math.random().toString(36).substring(7);
```

### ✅ Correct

```typescript
// Cryptographically secure token
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('hex');

// Token with expiration
const resetToken = {
  token: randomBytes(32).toString('hex'),
  expiresAt: Date.now() + 3600000, // 1 hour
  userId: user.id,
};
await db.passwordResets.create(resetToken);

// Rate limiting
import rateLimit from 'express-rate-limit';
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
});
app.post('/reset-password', resetLimiter, async (req, res) => {
  // Implementation
});

// Validate token on use
const reset = await db.passwordResets.findOne({ token });
if (!reset || reset.expiresAt < Date.now()) {
  throw new Error('Invalid or expired token');
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-weak-password-recovery': ['error', {
      minTokenEntropy: 128,
      maxTokenLifetimeHours: 24,
      recoveryKeywords: ['reset', 'recover', 'forgot', 'password'],
      secureTokenFunctions: ['randomBytes', 'crypto.randomUUID']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minTokenEntropy` | `number` | `128` | Minimum token entropy bits |
| `maxTokenLifetimeHours` | `number` | `24` | Maximum token lifetime |
| `recoveryKeywords` | `string[]` | `['reset', 'recover', 'forgot']` | Recovery-related keywords |
| `secureTokenFunctions` | `string[]` | `['randomBytes']` | Secure token generation functions |

## Error Message Format

```
🔒 CWE-640 OWASP:A07-Auth CVSS:9.8 | Weak Password Recovery | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Use cryptographically secure tokens with expiration | https://cwe.mitre.org/...
```

## Further Reading

- **[OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)** - Password recovery cheat sheet
- **[CWE-640](https://cwe.mitre.org/data/definitions/640.html)** - Weak password recovery
- **[ASVS Password Reset](https://github.com/OWASP/ASVS)** - Verification standard

## Related Rules

- [`no-hardcoded-credentials`](./no-hardcoded-credentials.md) - Hardcoded credentials
- [`no-insufficient-random`](./no-insufficient-random.md) - Weak random generation

