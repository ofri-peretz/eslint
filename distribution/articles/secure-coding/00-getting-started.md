---
title: 'Getting Started with eslint-plugin-secure-coding'
published: true
description: 'Install 75 security rules in 60 seconds. Full OWASP coverage, CWE mapping, and AI-ready error messages.'
tags: security, eslint, javascript, tutorial
cover_image:
series: Getting Started
---

**75 security rules. 60 seconds to install. Full OWASP coverage.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

## Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/auth.ts
  15:3  error  🔒 CWE-798 OWASP:A02 CVSS:7.5 | Hardcoded credential detected
               Fix: Use environment variable: process.env.DATABASE_PASSWORD

src/utils.ts
  42:5  error  🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dangerous eval() with expression
               Fix: Replace eval() with safer alternatives like JSON.parse()
```

## Available Presets

```javascript
// Balanced for most projects
secureCoding.configs.recommended;

// Maximum security (all 75 rules as errors)
secureCoding.configs.strict;

// Web application compliance
secureCoding.configs['owasp-top-10'];

// Mobile apps (React Native)
secureCoding.configs['owasp-mobile-top-10'];
```

## Rule Overview

| Category                | Rules  | Examples                                       |
| ----------------------- | ------ | ---------------------------------------------- |
| Injection Prevention    | 9      | eval(), child_process, GraphQL, XXE, XPath     |
| Path & File Security    | 3      | zip-slip, TOCTOU, non-literal filenames        |
| Regex Vulnerabilities   | 3      | ReDoS, unsafe regex construction               |
| Prototype Pollution     | 2      | object injection, unsafe deserialization       |
| Credentials & Secrets   | 2      | hardcoded credentials, insecure comparison     |
| Input Validation        | 4      | unvalidated input, improper sanitization       |
| Auth & Session          | 4      | missing auth, CSRF, privilege escalation       |
| Network & Headers       | 5      | CORS, security headers, clickjacking           |
| Data Exposure           | 2      | sensitive data, PII exposure                   |
| Resource & DoS          | 3      | buffer overread, unlimited allocation          |
| **OWASP Mobile Top 10** | **37** | insecure storage, certificate validation, HTTP |

## Customizing Rules

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended,

  // Override specific rules
  {
    rules: {
      // Downgrade to warning
      'secure-coding/no-pii-in-logs': 'warn',

      // Disable if not applicable
      'secure-coding/detect-non-literal-fs-filename': 'off',

      // Configure options
      'secure-coding/no-hardcoded-credentials': [
        'error',
        {
          allowTestFiles: true,
        },
      ],
    },
  },
];
```

## Ignoring False Positives

```javascript
// eslint-disable-next-line secure-coding/no-hardcoded-credentials
const EXAMPLE_KEY = 'pk_test_example'; // Test fixture
```

Or in config:

```javascript
{
  files: ['**/*.test.ts'],
  rules: {
    'secure-coding/no-hardcoded-credentials': 'off',
  },
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/security.yml
name: Security Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint . --max-warnings 0
```

### Pre-commit Hook

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts}": "eslint --max-warnings 0"
  }
}
```

## IDE Integration

### VS Code

ESLint extension will show errors inline:

```
🔒 CWE-798 | Hardcoded credential detected
```

### Cursor/Copilot

AI assistants read the structured errors and can auto-fix:

```
CWE-95 → Safe JSON.parse() alternative
CWE-798 → Environment variable fix
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-secure-coding

# Config (eslint.config.js)
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];

# Run
npx eslint .

# Fix auto-fixable issues
npx eslint . --fix
```

## Next Steps

1. **Read the rules**: Each rule has detailed docs with examples
2. **Try strict mode**: `secureCoding.configs.strict`
3. **Add to CI**: Block PRs with security issues
4. **Combine plugins**: Add `eslint-plugin-pg`, `eslint-plugin-jwt` for specialized coverage

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules)

📖 [OWASP Coverage Matrix](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding#owasp-coverage-matrix)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Questions? Open an issue on GitHub!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
