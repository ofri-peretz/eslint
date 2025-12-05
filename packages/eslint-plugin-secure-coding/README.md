# eslint-plugin-secure-coding

**Security rules that AI assistants can actually understand and fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A comprehensive security-focused ESLint plugin with **48 rules** covering OWASP Top 10, featuring LLM-optimized error messages that guide developers toward secure code.

---

## 💡 What Makes This Plugin Different

Every security rule produces a **structured 2-line error message** designed for both humans and AI assistants:

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
                    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Top 10 mapping (e.g., `OWASP:A03-Injection`)
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 🚀 Quick Start

```bash
# Install
npm install --save-dev eslint-plugin-secure-coding

# Add to eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended,
];

# Run
npx eslint .
```

---

## 📋 Available Presets

| Preset             | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| **`recommended`**  | Balanced security for most projects (48 rules, mixed severity) |
| **`strict`**       | Maximum security enforcement (all rules as errors)             |
| **`owasp-top-10`** | OWASP Top 10 2021 compliance focused                           |

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)** - Complete list of all 48 rules with configuration options

---

## 🔐 48 Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Injection Prevention (11 rules)

| Rule                                                                       | CWE     | OWASP | CVSS | Description                                     | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | ----- | ---- | ----------------------------------------------- | --- | --- | --- | --- |
| [no-sql-injection](./docs/rules/no-sql-injection.md)                       | CWE-89  | A03   | 9.8  | Prevent SQL injection via string concatenation  | 💼  |     |     |     |
| [database-injection](./docs/rules/database-injection.md)                   | CWE-89  | A03   | 9.8  | Comprehensive SQL/NoSQL/ORM injection detection | 💼  |     |     |     |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md) | CWE-95  | A03   | 9.8  | Detect eval() with dynamic expressions          | 💼  |     |     |     |
| [detect-child-process](./docs/rules/detect-child-process.md)               | CWE-78  | A03   | 9.8  | Detect command injection in child_process       | 💼  |     |     |     |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)     | CWE-95  | A03   | 7.5  | Forbid dynamic require() calls                  | 💼  |     |     |     |
| no-graphql-injection                                                       | CWE-943 | A03   | 8.6  | Prevent GraphQL injection attacks               | 💼  |     |     |     |
| no-xxe-injection                                                           | CWE-611 | A03   | 9.1  | Prevent XML External Entity injection           | 💼  |     |     |     |
| no-xpath-injection                                                         | CWE-643 | A03   | 9.8  | Prevent XPath injection attacks                 | 💼  |     |     |     |
| no-ldap-injection                                                          | CWE-90  | A03   | 9.8  | Prevent LDAP injection attacks                  | 💼  |     |     |     |
| no-directive-injection                                                     | CWE-94  | A03   | 8.8  | Prevent template directive injection            | 💼  |     |     |     |
| no-format-string-injection                                                 | CWE-134 | A03   | 9.8  | Prevent format string vulnerabilities           | 💼  |     |     |     |

### Path & File Security (3 rules)

| Rule                                                                             | CWE     | OWASP | CVSS | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------- | ------- | ----- | ---- | ----------------------------------------- | --- | --- | --- | --- |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | CWE-22  | A01   | 7.5  | Detect path traversal in fs operations    | 💼  |     |     |     |
| no-zip-slip                                                                      | CWE-22  | A01   | 8.1  | Prevent zip slip vulnerabilities          | 💼  |     |     |     |
| [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md)               | CWE-367 | A01   | 7.0  | Detect time-of-check to time-of-use races | 💼  |     |     | 💡  |

### Regex Security (3 rules)

| Rule                                                                         | CWE      | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------------- | -------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)       | CWE-400  | A03   | 7.5  | Detect ReDoS in RegExp construction  |     | ⚠️  |     |     |
| [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md)       | CWE-1333 | A03   | 7.5  | Detect ReDoS-vulnerable patterns     | 💼  |     |     | 💡  |
| [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md) | CWE-400  | A03   | 7.5  | Prevent unsafe regex from user input |     | ⚠️  |     | 💡  |

### Object & Prototype (2 rules)

| Rule                                                               | CWE     | OWASP | CVSS | Description                    | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------ | ------- | ----- | ---- | ------------------------------ | --- | --- | --- | --- |
| [detect-object-injection](./docs/rules/detect-object-injection.md) | CWE-915 | A03   | 7.3  | Detect prototype pollution     |     | ⚠️  |     |     |
| no-unsafe-deserialization                                          | CWE-502 | A08   | 9.8  | Prevent unsafe deserialization | 💼  |     |     |     |

### Cryptography (6 rules)

| Rule                                                                 | CWE     | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 | A07   | 7.5  | Detect hardcoded passwords/keys      | 💼  |     |     |     |
| [no-weak-crypto](./docs/rules/no-weak-crypto.md)                     | CWE-327 | A02   | 7.5  | Detect weak algorithms (MD5, SHA1)   | 💼  |     |     |     |
| [no-insufficient-random](./docs/rules/no-insufficient-random.md)     | CWE-330 | A02   | 5.3  | Detect Math.random() for security    |     | ⚠️  |     |     |
| no-timing-attack                                                     | CWE-208 | A02   | 5.9  | Detect timing attack vulnerabilities | 💼  |     |     |     |
| [no-insecure-comparison](./docs/rules/no-insecure-comparison.md)     | CWE-697 | A02   | 5.3  | Detect insecure string comparison    |     | ⚠️  | 🔧  |     |
| no-insecure-jwt                                                      | CWE-347 | A02   | 7.5  | Detect JWT security issues           | 💼  |     |     |     |

### Input Validation & XSS (5 rules)

| Rule                                                                     | CWE     | OWASP | CVSS | Description                           | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | ------- | ----- | ---- | ------------------------------------- | --- | --- | --- | --- |
| [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md)   | CWE-20  | A03   | 8.6  | Detect unvalidated user input         |     | ⚠️  |     |     |
| [no-unsanitized-html](./docs/rules/no-unsanitized-html.md)               | CWE-79  | A03   | 6.1  | Detect XSS via innerHTML              | 💼  |     |     |     |
| [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md) | CWE-79  | A03   | 6.1  | Detect XSS via URL parameters         |     | ⚠️  |     |     |
| no-improper-sanitization                                                 | CWE-116 | A03   | 7.5  | Detect improper output encoding       | 💼  |     |     |     |
| no-improper-type-validation                                              | CWE-20  | A04   | 5.3  | Detect type confusion vulnerabilities |     | ⚠️  |     |     |

### Authentication & Authorization (3 rules)

| Rule                                                                   | CWE     | OWASP | CVSS | Description                    | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------ | --- | --- | --- | --- |
| [no-missing-authentication](./docs/rules/no-missing-authentication.md) | CWE-306 | A07   | 9.8  | Detect missing auth checks     |     | ⚠️  |     |     |
| [no-privilege-escalation](./docs/rules/no-privilege-escalation.md)     | CWE-269 | A01   | 8.8  | Detect privilege escalation    |     | ⚠️  |     |     |
| no-weak-password-recovery                                              | CWE-640 | A07   | 9.8  | Detect insecure password reset | 💼  |     |     |     |

### Session & Cookies (3 rules)

| Rule                                                                       | CWE     | OWASP | CVSS | Description                       | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | ----- | ---- | --------------------------------- | --- | --- | --- | --- |
| [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md) | CWE-614 | A07   | 5.3  | Detect missing Secure/HttpOnly    |     | ⚠️  |     |     |
| [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md)   | CWE-352 | A07   | 8.8  | Detect missing CSRF tokens        |     | ⚠️  |     |     |
| [no-document-cookie](./docs/rules/no-document-cookie.md)                   | CWE-565 | A07   | 4.3  | Detect direct cookie manipulation |     | ⚠️  |     | 💡  |

### Network & Headers (5 rules)

| Rule                                                                       | CWE      | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | -------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [no-missing-cors-check](./docs/rules/no-missing-cors-check.md)             | CWE-942  | A05   | 7.5  | Detect missing CORS validation       |     | ⚠️  |     |     |
| [no-missing-security-headers](./docs/rules/no-missing-security-headers.md) | CWE-693  | A05   | 5.3  | Detect missing security headers      |     | ⚠️  |     | 💡  |
| [no-insecure-redirects](./docs/rules/no-insecure-redirects.md)             | CWE-601  | A01   | 6.1  | Detect open redirect vulnerabilities |     | ⚠️  |     | 💡  |
| [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md) | CWE-319  | A02   | 7.5  | Detect HTTP instead of HTTPS         |     | ⚠️  |     |     |
| no-clickjacking                                                            | CWE-1021 | A05   | 6.1  | Detect clickjacking vulnerabilities  | 💼  |     |     |     |

### Data Exposure (2 rules)

| Rule                                                                     | CWE     | OWASP | CVSS | Description                        | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | ------- | ----- | ---- | ---------------------------------- | --- | --- | --- | --- |
| [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md)   | CWE-200 | A01   | 7.5  | Detect sensitive data in responses | 💼  |     |     |     |
| [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md) | CWE-532 | A09   | 5.5  | Detect sensitive data in logs      |     | ⚠️  |     | 💡  |

### Buffer, Memory & DoS (3 rules)

| Rule                             | CWE     | OWASP | CVSS | Description                     | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------- | ------- | ----- | ---- | ------------------------------- | --- | --- | --- | --- |
| no-buffer-overread               | CWE-126 | A06   | 7.5  | Detect buffer over-read         | 💼  |     |     |     |
| no-unlimited-resource-allocation | CWE-770 | A05   | 7.5  | Detect unbounded allocations    | 💼  |     |     |     |
| no-unchecked-loop-condition      | CWE-835 | A05   | 7.5  | Detect infinite loop conditions | 💼  |     |     |     |

### Platform-Specific (2 rules)

| Rule                                   | CWE     | OWASP | CVSS | Description                        | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------- | ------- | ----- | ---- | ---------------------------------- | --- | --- | --- | --- |
| no-electron-security-issues            | CWE-693 | A05   | 8.8  | Detect Electron security misconfig | 💼  |     |     |     |
| no-insufficient-postmessage-validation | CWE-346 | A07   | 8.8  | Detect postMessage origin issues   | 💼  |     |     |     |

---

## 🤖 LLM & AI Integration

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## 📦 Related Packages

- **[@forge-js/eslint-plugin-llm-optimized](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)** - Full plugin with 144+ rules (security + architecture + React + more)
- **[@interlace/eslint-devkit](https://www.npmjs.com/package/@interlace/eslint-devkit)** - Build your own LLM-optimized ESLint rules

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
