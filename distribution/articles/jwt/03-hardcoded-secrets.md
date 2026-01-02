---
title: 'JWT Hardcoded Secrets: The Vulnerability in Plain Sight'
published: false
description: 'JWT secrets in source code get pushed to GitHub. Here is how attackers find them and how ESLint prevents it.'
tags: jwt, security, secrets, eslint
cover_image:
series: JWT Security
---

```javascript
const token = jwt.sign(payload, 'my-super-secret-key');
```

This secret is now in your git history. Forever.

## How Attackers Find Them

### 1. GitHub Search

```bash
# Attackers literally search GitHub for:
"jwt.sign" "secret"
"jsonwebtoken" password
HS256 key
```

### 2. Credential Scanners

Tools like trufflehog and gitleaks scan repos automatically:

```bash
trufflehog github --repo https://github.com/your-org/your-repo
```

### 3. Build Artifacts

Secrets bundled into client-side JavaScript:

```javascript
// In your React app:
const token = jwt.sign(data, 'secret123');
// Gets bundled → visible in browser DevTools
```

## The Fix

```javascript
// ✅ Use environment variables
const token = jwt.sign(payload, process.env.JWT_SECRET);

// ✅ Verify it exists
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}
```

## Secret Requirements

| Requirement | Bad         | Good                     |
| ----------- | ----------- | ------------------------ |
| Length      | `secret123` | 256+ bit random          |
| Storage     | Source code | Env var / Secret manager |
| Rotation    | Never       | Periodic                 |

## Generate Strong Secrets

```bash
# Generate 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: 4f8a...c2d1 (64 hex chars = 256 bits)
```

## ESLint Rules

```javascript
import jwtPlugin from 'eslint-plugin-jwt';

export default [
  {
    rules: {
      'jwt/no-hardcoded-secret': 'error',
      'jwt/no-weak-secret': 'error',
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-jwt](https://www.npmjs.com/package/eslint-plugin-jwt)

---

🚀 **grep your repo for hardcoded secrets!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
