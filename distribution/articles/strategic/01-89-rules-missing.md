---
title: '89 Security Rules Your Linter is Missing'
published: false
description: "eslint-plugin-security has 13 rules. We built 89. Here's the coverage gap that's leaving your code exposed."
tags: javascript, security, eslint, devsecops
cover_image:
canonical_url:
---

# 89 Security Rules Your Linter is Missing

If you're using `eslint-plugin-security`, you have 13 rules protecting your codebase.

We built **89**.

## The Coverage Gap

| Category             | eslint-plugin-security | eslint-plugin-secure-coding |
| -------------------- | ---------------------- | --------------------------- |
| Injection Prevention | 2                      | 11                          |
| Cryptography         | 0                      | 6                           |
| Authentication       | 0                      | 3                           |
| Session/Cookies      | 0                      | 3                           |
| OWASP Top 10 Web     | Partial                | Full                        |
| OWASP Mobile Top 10  | None                   | Full (30 rules)             |
| **Total Rules**      | **13**                 | **89**                      |

## What's Missing?

### Cryptography (6 rules you don't have)

```javascript
// ❌ eslint-plugin-security: No warning
const hash = crypto.createHash('md5').update(password);
```

```bash
# ✅ eslint-plugin-secure-coding:
error: 🔒 CWE-327 | Weak cryptographic algorithm: MD5
       Fix: Use crypto.createHash('sha256') or bcrypt for passwords
```

### JWT Security (0 → 1 rule)

```javascript
// ❌ eslint-plugin-security: No warning
jwt.verify(token, secret, { algorithms: ['none'] });
```

```bash
# ✅ eslint-plugin-secure-coding:
error: 🔒 CWE-347 | Insecure JWT configuration: 'none' algorithm allowed
       Fix: Specify allowed algorithms explicitly: { algorithms: ['HS256'] }
```

### Cookie Security (0 → 3 rules)

```javascript
// ❌ eslint-plugin-security: No warning
res.cookie('session', token); // Missing Secure, HttpOnly, SameSite
```

```bash
# ✅ eslint-plugin-secure-coding:
error: 🔒 CWE-614 | Insecure cookie settings
       Fix: Add { httpOnly: true, secure: true, sameSite: 'strict' }
```

### Mobile Security (0 → 30 rules)

The entire OWASP Mobile Top 10 2024:

- Credential storage
- Certificate validation
- PII in logs
- Debug code in production
- Tracking consent
- And 25 more...

## The Quality Difference

Every rule in `eslint-plugin-secure-coding` includes:

| Feature          | eslint-plugin-security | eslint-plugin-secure-coding |
| ---------------- | ---------------------- | --------------------------- |
| CWE Reference    | ❌                     | ✅                          |
| OWASP Mapping    | ❌                     | ✅                          |
| CVSS Score       | ❌                     | ✅                          |
| Fix Instructions | ❌                     | ✅                          |
| Compliance Tags  | ❌                     | ✅ (SOC2, PCI-DSS, HIPAA)   |

## Error Message Comparison

### eslint-plugin-security

```bash
Unsafe use of eval
```

### eslint-plugin-secure-coding

```bash
🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution detected | CRITICAL
   Fix: Avoid eval with user input. Use JSON.parse() or a safe parser.
```

AI assistants like Cursor and Copilot can parse our errors and auto-fix.

## Migration in 60 Seconds

```bash
# Remove old plugin
npm uninstall eslint-plugin-security

# Install new plugin
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

That's it. Same file. Same config pattern. 6x more coverage.

## Preset Options

| Preset                | Use Case                            |
| --------------------- | ----------------------------------- |
| `recommended`         | Balanced for most projects          |
| `strict`              | Maximum security (all 89 as errors) |
| `owasp-top-10`        | Web application compliance          |
| `owasp-mobile-top-10` | Mobile/React Native apps            |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

**89 rules. OWASP coverage. AI-ready error messages.**

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Full rule list](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
