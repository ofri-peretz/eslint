# eslint-plugin-express-security

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-backend.png" alt="ESLint Interlace - eslint-plugin-express-security" width="200" />
</div>

Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-express-security.svg)](https://www.npmjs.com/package/eslint-plugin-express-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-express-security.svg)](https://www.npmjs.com/package/eslint-plugin-express-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=express-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=express-security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/express-security](https://eslint.interlace.tools/docs/express-security)
>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-express-security --save-dev
```

---

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                                                                       | Headers & CORS |    CWE    |  OWASP  |  CVSS  |  Description                             |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  [require-helmet](#require-helmet)                                          | Headers & CORS |  CWE-693  |   A05   |  7.1   |  Require helmet() middleware             |  💼   |
|  [no-permissive-cors](#no-permissive-cors)                                  | Headers & CORS |  CWE-942  |   A05   |  9.1   |  Detect wildcard CORS origins            |  💼   |
|  [no-cors-credentials-wildcard](#no-cors-credentials-wildcard)              | Headers & CORS |  CWE-942  |   A05   |  9.1   |  Block credentials: true + origin: "\*"  |  💼   |
|  [require-express-body-parser-limits](#require-express-body-parser-limits)  | Headers & CORS |  CWE-770  |   A05   |  7.5   |  Require body parser size limits         |  ⚠️   |
|  Rule                                                       | CSRF & Cookies |    CWE    |  OWASP  |  CVSS  |  Description                     |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  [require-csrf-protection](#require-csrf-protection)        | CSRF & Cookies |  CWE-352  |   A07   |  8.8   |  Require CSRF middleware         |  ⚠️   |
|  [no-insecure-cookie-options](#no-insecure-cookie-options)  | CSRF & Cookies |  CWE-614  |   A07   |  5.3   |  Detect missing Secure/HttpOnly  |  💼   |
|  Rule                                                             | Rate Limiting & DoS |    CWE     |  OWASP  |  CVSS  |  Description                       |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  [require-rate-limiting](#require-rate-limiting)                  | Rate Limiting & DoS |  CWE-770   |   A05   |  7.5   |  Require rate limiting middleware  |  ⚠️   |
|  [no-express-unsafe-regex-route](#no-express-unsafe-regex-route)  | Rate Limiting & DoS |  CWE-1333  |   A03   |  7.5   |  Detect ReDoS in route patterns    |  💼   |
|  Rule                                                                         | GraphQL |    CWE    |  OWASP  |  CVSS  |  Description                            |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  [no-graphql-introspection-production](#no-graphql-introspection-production)  | GraphQL |  CWE-200  |   A01   |  5.3   |  Disable GraphQL introspection in prod  |  ⚠️   |

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  expressSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import expressSecurity from 'eslint-plugin-express-security';

export default [expressSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| **`recommended`** | Balanced security for Express projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                      |
| **`api`**         | HTTP/API security rules only (CORS, CSRF, cookies, rate limiting)       |
| **`graphql`**     | GraphQL-specific security rules only                                    |

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  // Baseline for all Express apps
  expressSecurity.configs.recommended,

  // Strict mode for payment/auth services
  {
    files: ['services/payments/**', 'services/auth/**'],
    ...expressSecurity.configs.strict,
  },

  // GraphQL security for GraphQL servers
  {
    files: ['services/graphql/**'],
    ...expressSecurity.configs.graphql,
  },
];
```

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
