# Rules Reference

> Complete list of all 48 security rules with configuration options.

## Quick Navigation

| Category | Rules |
|----------|-------|
| [Injection Prevention](#injection-prevention) | 11 rules |
| [Path & File Security](#path--file-security) | 3 rules |
| [Regex Security](#regex-security) | 3 rules |
| [Object & Prototype](#object--prototype) | 2 rules |
| [Cryptography](#cryptography) | 6 rules |
| [Input Validation & XSS](#input-validation--xss) | 5 rules |
| [Authentication & Authorization](#authentication--authorization) | 3 rules |
| [Session & Cookies](#session--cookies) | 3 rules |
| [Network & Headers](#network--headers) | 5 rules |
| [Data Exposure](#data-exposure) | 2 rules |
| [Buffer, Memory & DoS](#buffer-memory--dos) | 3 rules |
| [Platform-Specific](#platform-specific) | 2 rules |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 💼 | Error in `recommended` preset |
| ⚠️ | Warning in `recommended` preset |
| 🔧 | Auto-fixable |
| 💡 | Has suggestions |

---

## Injection Prevention

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-sql-injection](./rules/no-sql-injection.md) | CWE-89 | 9.8 | Prevent SQL injection via string concatenation | 💼 | | | 💡 |
| [database-injection](./rules/database-injection.md) | CWE-89 | 9.8 | Comprehensive SQL/NoSQL/ORM injection detection | 💼 | | | |
| [detect-eval-with-expression](./rules/detect-eval-with-expression.md) | CWE-95 | 9.8 | Detect eval() with dynamic expressions | 💼 | | | |
| [detect-child-process](./rules/detect-child-process.md) | CWE-78 | 9.8 | Detect command injection in child_process | 💼 | | | |
| [no-unsafe-dynamic-require](./rules/no-unsafe-dynamic-require.md) | CWE-95 | 7.5 | Forbid dynamic require() calls | 💼 | | | |
| [no-graphql-injection](./rules/no-graphql-injection.md) | CWE-943 | 8.6 | Prevent GraphQL injection attacks | 💼 | | | 💡 |
| [no-xxe-injection](./rules/no-xxe-injection.md) | CWE-611 | 9.1 | Prevent XML External Entity injection | 💼 | | | |
| [no-xpath-injection](./rules/no-xpath-injection.md) | CWE-643 | 9.8 | Prevent XPath injection attacks | 💼 | | | 💡 |
| [no-ldap-injection](./rules/no-ldap-injection.md) | CWE-90 | 9.8 | Prevent LDAP injection attacks | 💼 | | | 💡 |
| [no-directive-injection](./rules/no-directive-injection.md) | CWE-94 | 8.8 | Prevent template directive injection | 💼 | | | 💡 |
| [no-format-string-injection](./rules/no-format-string-injection.md) | CWE-134 | 9.8 | Prevent format string vulnerabilities | 💼 | | | 💡 |

## Path & File Security

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [detect-non-literal-fs-filename](./rules/detect-non-literal-fs-filename.md) | CWE-22 | 7.5 | Detect path traversal in fs operations | 💼 | | | |
| [no-zip-slip](./rules/no-zip-slip.md) | CWE-22 | 8.1 | Prevent zip slip vulnerabilities | 💼 | | | 💡 |
| [no-toctou-vulnerability](./rules/no-toctou-vulnerability.md) | CWE-367 | 7.0 | Detect time-of-check to time-of-use races | 💼 | | | 💡 |

## Regex Security

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [detect-non-literal-regexp](./rules/detect-non-literal-regexp.md) | CWE-400 | 7.5 | Detect ReDoS in RegExp construction | | ⚠️ | | |
| [no-redos-vulnerable-regex](./rules/no-redos-vulnerable-regex.md) | CWE-1333 | 7.5 | Detect ReDoS-vulnerable patterns | 💼 | | | 💡 |
| [no-unsafe-regex-construction](./rules/no-unsafe-regex-construction.md) | CWE-400 | 7.5 | Prevent unsafe regex from user input | | ⚠️ | | 💡 |

## Object & Prototype

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [detect-object-injection](./rules/detect-object-injection.md) | CWE-915 | 7.3 | Detect prototype pollution | | ⚠️ | | |
| [no-unsafe-deserialization](./rules/no-unsafe-deserialization.md) | CWE-502 | 9.8 | Prevent unsafe deserialization | 💼 | | | 💡 |

## Cryptography

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-hardcoded-credentials](./rules/no-hardcoded-credentials.md) | CWE-798 | 7.5 | Detect hardcoded passwords/keys | 💼 | | | 💡 |
| [no-weak-crypto](./rules/no-weak-crypto.md) | CWE-327 | 7.5 | Detect weak algorithms (MD5, SHA1) | 💼 | | | |
| [no-insufficient-random](./rules/no-insufficient-random.md) | CWE-330 | 5.3 | Detect Math.random() for security | | ⚠️ | | |
| [no-timing-attack](./rules/no-timing-attack.md) | CWE-208 | 5.9 | Detect timing attack vulnerabilities | 💼 | | 🔧 | |
| [no-insecure-comparison](./rules/no-insecure-comparison.md) | CWE-697 | 5.3 | Detect insecure string comparison | | ⚠️ | 🔧 | |
| [no-insecure-jwt](./rules/no-insecure-jwt.md) | CWE-347 | 7.5 | Detect JWT security issues | 💼 | | | 💡 |

## Input Validation & XSS

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-unvalidated-user-input](./rules/no-unvalidated-user-input.md) | CWE-20 | 8.6 | Detect unvalidated user input | | ⚠️ | | |
| [no-unsanitized-html](./rules/no-unsanitized-html.md) | CWE-79 | 6.1 | Detect XSS via innerHTML | 💼 | | | |
| [no-unescaped-url-parameter](./rules/no-unescaped-url-parameter.md) | CWE-79 | 6.1 | Detect XSS via URL parameters | | ⚠️ | | |
| [no-improper-sanitization](./rules/no-improper-sanitization.md) | CWE-116 | 7.5 | Detect improper output encoding | 💼 | | | 💡 |
| [no-improper-type-validation](./rules/no-improper-type-validation.md) | CWE-20 | 5.3 | Detect type confusion vulnerabilities | | ⚠️ | | 💡 |

## Authentication & Authorization

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-missing-authentication](./rules/no-missing-authentication.md) | CWE-306 | 9.8 | Detect missing auth checks | | ⚠️ | | |
| [no-privilege-escalation](./rules/no-privilege-escalation.md) | CWE-269 | 8.8 | Detect privilege escalation | | ⚠️ | | |
| [no-weak-password-recovery](./rules/no-weak-password-recovery.md) | CWE-640 | 9.8 | Detect insecure password reset | 💼 | | | 💡 |

## Session & Cookies

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-insecure-cookie-settings](./rules/no-insecure-cookie-settings.md) | CWE-614 | 5.3 | Detect missing Secure/HttpOnly | | ⚠️ | | |
| [no-missing-csrf-protection](./rules/no-missing-csrf-protection.md) | CWE-352 | 8.8 | Detect missing CSRF tokens | | ⚠️ | | |
| [no-document-cookie](./rules/no-document-cookie.md) | CWE-565 | 4.3 | Detect direct cookie manipulation | | ⚠️ | | 💡 |

## Network & Headers

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-missing-cors-check](./rules/no-missing-cors-check.md) | CWE-942 | 7.5 | Detect missing CORS validation | | ⚠️ | | |
| [no-missing-security-headers](./rules/no-missing-security-headers.md) | CWE-693 | 5.3 | Detect missing security headers | | ⚠️ | | 💡 |
| [no-insecure-redirects](./rules/no-insecure-redirects.md) | CWE-601 | 6.1 | Detect open redirect vulnerabilities | | ⚠️ | | 💡 |
| [no-unencrypted-transmission](./rules/no-unencrypted-transmission.md) | CWE-319 | 7.5 | Detect HTTP instead of HTTPS | | ⚠️ | | |
| [no-clickjacking](./rules/no-clickjacking.md) | CWE-1021 | 6.1 | Detect clickjacking vulnerabilities | 💼 | | | 💡 |

## Data Exposure

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-exposed-sensitive-data](./rules/no-exposed-sensitive-data.md) | CWE-200 | 7.5 | Detect sensitive data in responses | 💼 | | | |
| [no-sensitive-data-exposure](./rules/no-sensitive-data-exposure.md) | CWE-532 | 5.5 | Detect sensitive data in logs | | ⚠️ | | 💡 |

## Buffer, Memory & DoS

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-buffer-overread](./rules/no-buffer-overread.md) | CWE-126 | 7.5 | Detect buffer over-read | 💼 | | | 💡 |
| [no-unlimited-resource-allocation](./rules/no-unlimited-resource-allocation.md) | CWE-770 | 7.5 | Detect unbounded allocations | 💼 | | | 💡 |
| [no-unchecked-loop-condition](./rules/no-unchecked-loop-condition.md) | CWE-835 | 7.5 | Detect infinite loop conditions | 💼 | | | 💡 |

## Platform-Specific

| Rule | CWE | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 |
|------|-----|------|-------------|----|----|----|----|
| [no-electron-security-issues](./rules/no-electron-security-issues.md) | CWE-693 | 8.8 | Detect Electron security misconfig | 💼 | | | 💡 |
| [no-insufficient-postmessage-validation](./rules/no-insufficient-postmessage-validation.md) | CWE-346 | 8.8 | Detect postMessage origin issues | 💼 | | | 💡 |

---

## Configuration Examples

### Basic Setup

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended,
];
```

### Custom Configuration

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    plugins: {
      'secure-coding': secureCoding,
    },
    rules: {
      // Critical rules as errors
      'secure-coding/no-sql-injection': 'error',
      'secure-coding/no-hardcoded-credentials': 'error',
      
      // Adjust rule options
      'secure-coding/no-hardcoded-credentials': ['error', {
        minLength: 16,
        detectApiKeys: true,
        allowInTests: true,
      }],
      
      // Disable specific rules
      'secure-coding/detect-object-injection': 'off',
    },
  },
];
```

### OWASP Top 10 Compliance

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs['owasp-top-10'],
];
```

---

## Code Coverage Summary

| Metric | Value |
|--------|-------|
| **Statements** | 42.83% |
| **Branches** | 38.45% |
| **Functions** | 46.21% |
| **Lines** | 43.12% |

> Note: Coverage varies per rule. Some rules have 90%+ coverage while others are in development.

---

## Further Reading

- **[OWASP Top 10 2021](https://owasp.org/Top10/)** - Web application security risks
- **[CWE Top 25](https://cwe.mitre.org/top25/)** - Most dangerous software weaknesses
- **[ESLint MCP Integration](https://eslint.org/docs/latest/use/mcp)** - AI assistant configuration

