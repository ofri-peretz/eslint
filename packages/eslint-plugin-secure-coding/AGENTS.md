# eslint-plugin-secure-coding - AI Agent Guide

## Package Overview

| Field           | Value                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| **Name**        | eslint-plugin-secure-coding                                                              |
| **Version**     | 3.0.0                                                                                    |
| **Description** | Security-focused ESLint plugin with 89 LLM-optimized rules for detecting vulnerabilities |
| **Type**        | ESLint Plugin                                                                            |
| **Language**    | TypeScript                                                                               |
| **Node.js**     | >=18.0.0                                                                                 |
| **ESLint**      | ^8.0.0 \|\| ^9.0.0                                                                       |
| **License**     | MIT                                                                                      |
| **Homepage**    | https://github.com/ofri-peretz/eslint#readme                                             |
| **Repository**  | https://github.com/ofri-peretz/eslint.git                                                |
| **Directory**   | packages/eslint-plugin-secure-coding                                                     |

## Installation

```bash
npm install --save-dev eslint-plugin-secure-coding
# or
pnpm add -D eslint-plugin-secure-coding
# or
yarn add -D eslint-plugin-secure-coding
```

## Quick Start

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

## Available Presets

| Preset           | Rules                 | Description                         |
| ---------------- | --------------------- | ----------------------------------- |
| **recommended**  | 89 rules (mixed)      | Balanced security (Web + Mobile)    |
| **strict**       | 89 rules (all errors) | Maximum security enforcement        |
| **owasp-top-10** | 32 rules              | OWASP Top 10 2021 compliance        |
| **owasp-mobile** | 40 rules              | OWASP Mobile Top 10 2024 compliance |

## Rule Categories

### Injection Prevention (11 rules)

- `no-sql-injection` - CWE-89 - SQL injection via string concatenation
- `database-injection` - CWE-89 - Comprehensive SQL/NoSQL/ORM injection
- `detect-eval-with-expression` - CWE-95 - eval() with dynamic expressions
- `detect-child-process` - CWE-78 - Command injection in child_process
- `no-unsafe-dynamic-require` - CWE-95 - Dynamic require() calls
- `no-graphql-injection` - CWE-943 - GraphQL injection attacks
- `no-xxe-injection` - CWE-611 - XML External Entity injection
- `no-xpath-injection` - CWE-643 - XPath injection attacks
- `no-ldap-injection` - CWE-90 - LDAP injection attacks
- `no-directive-injection` - CWE-94 - Template directive injection
- `no-format-string-injection` - CWE-134 - Format string vulnerabilities

### Path & File Security (3 rules)

- `detect-non-literal-fs-filename` - CWE-22 - Path traversal in fs operations
- `no-zip-slip` - CWE-22 - Zip slip vulnerabilities
- `no-toctou-vulnerability` - CWE-367 - TOCTOU race conditions

### Regex Security (3 rules)

- `detect-non-literal-regexp` - CWE-400 - ReDoS in RegExp construction
- `no-redos-vulnerable-regex` - CWE-1333 - ReDoS-vulnerable patterns
- `no-unsafe-regex-construction` - CWE-400 - Unsafe regex from user input

### Object & Prototype (2 rules)

- `detect-object-injection` - CWE-915 - Prototype pollution
- `no-unsafe-deserialization` - CWE-502 - Unsafe deserialization

### Cryptography (6 rules)

- `no-hardcoded-credentials` - CWE-798 - Hardcoded passwords/keys
- `no-weak-crypto` - CWE-327 - Weak algorithms (MD5, SHA1)
- `no-insufficient-random` - CWE-330 - Math.random() for security
- `no-timing-attack` - CWE-208 - Timing attack vulnerabilities
- `no-insecure-comparison` - CWE-697 - Insecure string comparison
- `no-insecure-jwt` - CWE-347 - JWT security issues

### Input Validation & XSS (5 rules)

- `no-unvalidated-user-input` - CWE-20 - Unvalidated user input
- `no-unsanitized-html` - CWE-79 - XSS via innerHTML
- `no-unescaped-url-parameter` - CWE-79 - XSS via URL parameters
- `no-improper-sanitization` - CWE-116 - Improper output encoding
- `no-improper-type-validation` - CWE-20 - Type confusion vulnerabilities

### Authentication & Authorization (3 rules)

- `no-missing-authentication` - CWE-306 - Missing auth checks
- `no-privilege-escalation` - CWE-269 - Privilege escalation
- `no-weak-password-recovery` - CWE-640 - Insecure password reset

### Session & Cookies (3 rules)

- `no-insecure-cookie-settings` - CWE-614 - Missing Secure/HttpOnly
- `no-missing-csrf-protection` - CWE-352 - Missing CSRF tokens
- `no-document-cookie` - CWE-565 - Direct cookie manipulation

### Network & Headers (5 rules)

- `no-missing-cors-check` - CWE-942 - Missing CORS validation
- `no-missing-security-headers` - CWE-693 - Missing security headers
- `no-insecure-redirects` - CWE-601 - Open redirect vulnerabilities
- `no-unencrypted-transmission` - CWE-319 - HTTP instead of HTTPS
- `no-clickjacking` - CWE-1021 - Clickjacking vulnerabilities

### Data Exposure (2 rules)

- `no-exposed-sensitive-data` - CWE-200 - Sensitive data in responses
- `no-sensitive-data-exposure` - CWE-532 - Sensitive data in logs

### Buffer & Memory (1 rule)

- `no-buffer-overread` - CWE-126 - Buffer over-read

### DoS & Resource (2 rules)

- `no-unlimited-resource-allocation` - CWE-770 - Unbounded allocations
- `no-unchecked-loop-condition` - CWE-835 - Infinite loop conditions

### Mobile Security (30 rules)

- `no-http-urls` - CWE-319 - Prevent insecure HTTP URLs
- `no-hardcoded-credentials` - CWE-798 - Detect hardcoded secrets
- `no-credentials-in-storage-api` - CWE-522 - Prevent credentials in localStorage
- `no-credentials-in-query-params` - CWE-598 - Detect credentials in URLs
- `no-allow-arbitrary-loads` - CWE-295 - Prevent insecure ATS configuration
- `no-disabled-certificate-validation` - CWE-295 - Detect disabled cert validation
- `require-https-only` - CWE-319 - Enforce HTTPS-only connections
- `require-network-timeout` - CWE-400 - Require network timeouts
- `detect-weak-password-validation` - CWE-521 - Detect weak password requirements
- `no-client-side-auth-logic` - CWE-602 - Prevent client-side auth logic
- `no-hardcoded-session-tokens` - CWE-798 - Detect hardcoded session tokens
- `no-unvalidated-deeplinks` - CWE-939 - Unvalidated deep link usage
- `require-url-validation` - CWE-601 - Require URL validation
- `require-mime-type-validation` - CWE-434 - Require MIME type validation
- `no-arbitrary-file-access` - CWE-22 - Prevent path traversal
- `no-pii-in-logs` - CWE-532 - Prevent PII in logs
- `no-tracking-without-consent` - CWE-359 - Require tracking consent
- `no-sensitive-data-in-analytics` - CWE-359 - Prevent PII in analytics
- `require-data-minimization` - CWE-213 - Enforce data minimization
- `no-debug-code-in-production` - CWE-489 - Detect debug code
- `require-code-minification` - CWE-656 - Require code minification
- `no-verbose-error-messages` - CWE-209 - Prevent verbose error messages
- `require-secure-defaults` - CWE-276 - Require secure defaults
- `no-sensitive-data-in-cache` - CWE-524 - Prevent sensitive data in cache
- `no-data-in-temp-storage` - CWE-312 - Prevent sensitive data in temp storage
- `require-secure-deletion` - CWE-459 - Require secure deletion
- `require-storage-encryption` - CWE-311 - Require storage encryption
- `no-unencrypted-local-storage` - CWE-312 - Prevent unencrypted local storage
- `require-credential-storage` - CWE-522 - Require secure credential storage
- `no-exposed-debug-endpoints` - CWE-489 - Prevent exposed debug endpoints

### Platform-Specific (2 rules)

- `no-electron-security-issues` - CWE-693 - Electron security misconfig
- `no-insufficient-postmessage-validation` - CWE-346 - postMessage origin issues

## Error Message Format

All rules produce LLM-optimized 2-line structured messages:

```
Line 1: [Icon] [CWE] [OWASP] [CVSS] | [Description] | [SEVERITY] [Compliance]
Line 2:    Fix: [instruction] | [doc-link]
```

**Example:**

```
🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

## ESLint MCP Integration

Configure in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

## Key Features

| Feature              | Value                            |
| -------------------- | -------------------------------- |
| **Total Rules**      | 89                               |
| **CWE Coverage**     | 100% (all rules include CWE IDs) |
| **OWASP Top 10**     | Full Web (2021) + Mobile (2024)  |
| **AI Auto-Fix Rate** | 60-80%                           |
| **Performance**      | <10ms overhead per file          |
| **Privacy**          | 100% local, no cloud calls       |

## FAQ

**Q: How do I enable all security rules?**
A: Use `secureCoding.configs.strict`

**Q: How do I configure a specific rule?**
A: `'secure-coding/no-sql-injection': ['error', { strategy: 'parameterize' }]`

**Q: How do I disable a rule inline?**
A: `// eslint-disable-next-line secure-coding/no-sql-injection`

**Q: Is it compatible with TypeScript?**
A: Yes, native TypeScript support.

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## License

MIT © Ofri Peretz
