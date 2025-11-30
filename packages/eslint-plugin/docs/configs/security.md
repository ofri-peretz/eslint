# security Configuration

Comprehensive security vulnerability detection for critical applications.

## Overview

The `security` configuration enables all security-related rules at `error` level. This configuration is designed for security-critical applications, compliance requirements, or teams focused on security hardening.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.security,
];
```

## Rules Included (All Error Level)

### Injection Prevention

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-sql-injection` | CWE-89 | Prevent SQL injection via string concatenation |
| `security/database-injection` | CWE-89 | Comprehensive injection detection (SQL, NoSQL, ORM) |
| `security/detect-eval-with-expression` | CWE-95 | Detect eval() with dynamic expressions |
| `security/detect-child-process` | CWE-78 | Detect command injection in child_process |
| `security/detect-non-literal-fs-filename` | CWE-22 | Detect path traversal in fs operations |
| `security/no-unsafe-dynamic-require` | CWE-95 | Forbid dynamic require() calls |
| `security/detect-object-injection` | CWE-915 | Detect prototype pollution |

### Cryptography & Secrets

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-hardcoded-credentials` | CWE-798 | Detect hardcoded passwords, API keys, tokens |
| `security/no-weak-crypto` | CWE-327 | Detect weak cryptography (MD5, SHA1, DES) |
| `security/no-insufficient-random` | CWE-330 | Detect weak random (Math.random()) |

### Input Validation

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-unvalidated-user-input` | CWE-20 | Detect unvalidated user input |
| `security/no-unsanitized-html` | CWE-79 | Prevent XSS via HTML injection |
| `security/no-unescaped-url-parameter` | CWE-79 | Prevent XSS via URL parameters |

### Authentication & Authorization

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-missing-authentication` | CWE-306 | Detect missing auth checks |
| `security/no-privilege-escalation` | CWE-269 | Detect privilege escalation |
| `security/no-missing-cors-check` | CWE-942 | Detect missing CORS validation |
| `security/no-missing-csrf-protection` | CWE-352 | Detect missing CSRF protection |

### Data Protection

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-exposed-sensitive-data` | CWE-200 | Detect PII exposure |
| `security/no-sensitive-data-exposure` | CWE-200 | Detect sensitive data exposure |
| `security/no-unencrypted-transmission` | CWE-319 | Detect HTTP vs HTTPS issues |
| `security/no-insecure-cookie-settings` | CWE-614 | Detect insecure cookies |

### Regex Security

| Rule | CWE | Description |
|------|-----|-------------|
| `security/detect-non-literal-regexp` | CWE-400 | Detect ReDoS in RegExp |
| `security/no-redos-vulnerable-regex` | CWE-400 | Detect ReDoS patterns |
| `security/no-unsafe-regex-construction` | CWE-400 | Detect unsafe RegExp |

### Comparison & Logic

| Rule | CWE | Description |
|------|-----|-------------|
| `security/no-insecure-comparison` | CWE-697 | Detect insecure == and != |

## Security Compliance Mapping

| Standard | Covered Rules |
|----------|---------------|
| OWASP Top 10 | A01 (Injection), A02 (Crypto), A03 (XSS), A07 (Auth) |
| CWE Top 25 | 15+ CWE categories covered |
| PCI DSS | Requirement 6.5 (Secure Coding) |

## When to Use

**Use `security` when:**
- Building security-critical applications
- Handling sensitive data (PII, financial, healthcare)
- Meeting compliance requirements (SOC 2, PCI DSS, HIPAA)
- Undergoing security audits
- Working on authentication/authorization systems

**Combine with other configs for full coverage:**

```javascript
export default [
  llmOptimized.configs.recommended,  // General rules
  llmOptimized.configs.security,     // Security rules
];
```

## Configuration Examples

### Backend API Security

```javascript
export default [
  {
    files: ['src/api/**/*.ts', 'src/routes/**/*.ts'],
    ...llmOptimized.configs.security,
  },
];
```

### Full-Stack Application

```javascript
export default [
  // General rules for all files
  llmOptimized.configs.recommended,
  
  // Extra security for API routes
  {
    files: ['src/api/**/*.ts'],
    rules: {
      // Stricter for API
      '@forge-js/llm-optimized/security/no-missing-authentication': 'error',
      '@forge-js/llm-optimized/security/no-missing-csrf-protection': 'error',
    },
  },
];
```

### Handling False Positives

Some security rules may flag legitimate patterns. Configure exceptions carefully:

```javascript
export default [
  llmOptimized.configs.security,
  {
    rules: {
      // Allow eval in specific sandboxed code
      '@forge-js/llm-optimized/security/detect-eval-with-expression': ['error', {
        allowInSandbox: true,
      }],
    },
  },
  {
    // Disable for test files
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@forge-js/llm-optimized/security/no-hardcoded-credentials': 'off',
    },
  },
];
```

## CI/CD Security Gate

```yaml
# .github/workflows/security.yml
name: Security Lint
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint . --config security.config.js
        continue-on-error: false  # Block PR on security issues
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Database](https://cwe.mitre.org/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)

