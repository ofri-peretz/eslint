---
title: 'Stop Leaking PII in Your Logs'
published: false
description: "Logging user emails, IPs, and tokens creates compliance nightmares. Here's how to detect and prevent PII in logs."
tags: javascript, security, logging, privacy
cover_image:
canonical_url:
---

# Stop Leaking PII in Your Logs

Your logs are a security audit waiting to happen.

## The Problem

```javascript
// ❌ Common logging patterns with PII
console.log('User registered:', user);
logger.info(`Login attempt for ${email} from ${ipAddress}`);
logger.debug('Request body:', req.body); // Contains passwords
logger.error('Payment failed for', { email, cardNumber, cvv });
```

Every log entry is:

- Stored for months or years
- Accessible to developers, ops, third parties
- A GDPR/HIPAA/SOC2 compliance risk

## What Counts as PII?

| Category        | Examples                         |
| --------------- | -------------------------------- |
| **Identifiers** | Email, phone, SSN, passport      |
| **Financial**   | Card numbers, CVV, bank accounts |
| **Auth**        | Passwords, tokens, API keys      |
| **Medical**     | Health data, prescriptions       |
| **Location**    | IP address, precise coordinates  |

## Real Compliance Impact

| Regulation | PII in Logs | Penalty                         |
| ---------- | ----------- | ------------------------------- |
| GDPR       | Violation   | Up to €20M or 4% revenue        |
| HIPAA      | Violation   | Up to $1.5M per incident        |
| PCI-DSS    | Violation   | Fines + loss of card processing |
| SOC2       | Finding     | Audit failure                   |

## The Correct Pattern

```javascript
// ✅ Redact PII before logging
const sanitizedUser = {
  id: user.id,
  role: user.role,
  // email, phone, ssn omitted
};
logger.info('User registered:', sanitizedUser);

// ✅ Use structured logging with allowlists
logger.info('Login attempt', {
  userId: user.id,
  timestamp: Date.now(),
  // NOT email, NOT ip
});

// ✅ Hash identifiers if needed for debugging
const hashedEmail = crypto
  .createHash('sha256')
  .update(email)
  .digest('hex')
  .slice(0, 8);
logger.debug('User action', { userHash: hashedEmail });
```

## Let ESLint Detect This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

PII patterns are detected:

```bash
src/auth.ts
  12:3  warning  🔒 CWE-532 OWASP:M6 CVSS:7.5 | Potential PII in log statement
                 Fix: Remove or redact email, password, ssn, creditCard from logs
```

## What Gets Flagged

The rule detects logging of:

- `email`, `userEmail`, `emailAddress`
- `password`, `pwd`, `passwd`
- `ssn`, `socialSecurity`
- `creditCard`, `cardNumber`, `cvv`
- `phone`, `phoneNumber`
- `ipAddress`, `ip`
- `token`, `apiKey`, `secret`

## Building a Safe Logger

```javascript
// Wrapper that auto-redacts
function safeLog(level, message, data = {}) {
  const PII_KEYS = ['email', 'password', 'ssn', 'token', 'ip'];

  const sanitized = Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !PII_KEYS.some((pii) => key.toLowerCase().includes(pii)),
    ),
  );

  logger[level](message, sanitized);
}

// Usage
safeLog('info', 'User registered', user); // PII automatically stripped
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Protect your users. Protect your compliance. Stop logging PII.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-pii-in-logs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-pii-in-logs.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
