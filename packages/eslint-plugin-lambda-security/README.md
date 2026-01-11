# eslint-plugin-lambda-security

<div align="center">
  <img src="https://eslint.interlace.tools/images/interlace-hero.png" alt="ESLint Interlace - eslint-plugin-lambda-security" width="200" />
</div>

Security best practices for AWS Lambda functions.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg)](https://www.npmjs.com/package/eslint-plugin-lambda-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-lambda-security.svg)](https://www.npmjs.com/package/eslint-plugin-lambda-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=lambda-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=lambda-security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/lambda-security](https://eslint.interlace.tools/docs/lambda-security)
>
> **Serverless-first security:** This plugin provides security rules for **AWS Lambda**, **Middy.js**, **Serverless Framework**, **AWS SAM**, and **AWS SDK v3**.
> With **5 security rules** mapped to OWASP Serverless Top 10, CWE and CVSS, it transforms your linter into a serverless security auditor that AI assistants can understand and fix.

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-lambda-security --save-dev
```

---

## 💡 What you get

- **Serverless-focused coverage:** 5 rules targeting Lambda-specific vulnerabilities (credentials, CORS, secrets, logging).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Serverless Top 10, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict` for fast policy rollout.
- **Framework-aware:** Detects Middy middleware, API Gateway response patterns, AWS SDK v3 clients.
- **Low false positive rate:** Context-aware detection with production heuristics.

Every security rule produces a **structured 2-line error message**:

```bash
src/handlers/api.ts
  18:5   error  🔒 CWE-798 OWASP:SAS-2 CVSS:9.8 | Hardcoded AWS credentials detected | CRITICAL [SOC2,PCI-DSS]
                    Fix: Use credential provider chain or Lambda execution role | https://owasp.org/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Serverless Top 10 mapping
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 📊 OWASP Serverless Top 10 Coverage Matrix

| OWASP Category                         | Coverage | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **SAS-1: Injection** |  |  |  |  |  |  |  |  |  |
| **SAS-2: Broken Authentication** |  |  |  |  |  |  |  |  |  |
| **SAS-3: Sensitive Data Exposure** |  |  |  |  |  |  |  |  |  |
| **SAS-4: Security Misconfiguration** |  |  |  |  |  |  |  |  |  |
| **SAS-5: Broken Access Control** |  |  |  |  |  |  |  |  |  |
| **SAS-6: Insufficient Logging** |  |  |  |  |  |  |  |  |  |
| **SAS-7: Denial of Service** |  |  |  |  |  |  |  |  |  |
| **SAS-8: Server-Side Request Forgery** |  |  |  |  |  |  |  |  |  |
| **SAS-9: Functions Misconfiguration** |  |  |  |  |  |  |  |  |  |
| **SAS-10: Improper Crypto** |  |  |  |  |  |  |  |  |  |
---

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  [no-hardcoded-credentials-sdk](#no-hardcoded-credentials-sdk)  | Credential & Secrets Protection |  CWE-798  |  SAS-2  |  9.8  |  Hardcoded AWS credentials in SDK v3 clients  |  💼  |
|  [no-secrets-in-env](#no-secrets-in-env)  | Credential & Secrets Protection |  CWE-798  |  SAS-3  |  9.8  |  Secrets hardcoded in environment variables  |  💼  |
|  [no-env-logging](#no-env-logging)  | Credential & Secrets Protection |  CWE-532  |  SAS-3  |  7.5  |  Logging entire `process.env` object  |  ⚠️  |
|  [no-permissive-cors-response](#no-permissive-cors-response)  | CORS Security |  CWE-942  |  SAS-4  |  9.1  |  Wildcard CORS in Lambda response headers  |  💼  |  🔧  |
|  [no-permissive-cors-middy](#no-permissive-cors-middy)  | CORS Security |  CWE-942  |  SAS-4  |  9.1  |  Permissive CORS in @middy/http-cors middleware  |  💼  |
|  no-unvalidated-event-body  | Input Validation & Access Control |  CWE-20  |  SAS-1  |  8.0  |  Lambda handlers using event body without validation  |  ⚠️  |  💡  |
|  no-missing-authorization-check  | Input Validation & Access Control |  CWE-862  |  SAS-5  |  7.5  |  Lambda handlers without authorization checks  |  ⚠️  |  💡  |
|  no-overly-permissive-iam-policy  | Input Validation & Access Control |  CWE-732  |  SAS-5  |  6.5  |  IAM policies with wildcard permissions  |  💼  |  💡  |
|  no-user-controlled-requests  | Input Validation & Access Control |  CWE-918  |  SAS-8  |  9.1  |  HTTP requests with user-controlled URLs (SSRF)  |  💼  |  💡  |
|  no-error-swallowing  | Security Operations |  CWE-390  |  SAS-6  |  5.0  |  Empty catch blocks and missing error logging  |  ⚠️  |  💡  |
|  require-timeout-handling  | Security Operations |  CWE-400  |  SAS-7  |  6.0  |  External calls without timeout handling  |  ⚠️  |  💡  |
|  no-unbounded-batch-processing  | Security Operations |  CWE-770  |  SAS-7  |  5.5  |  Processing batch records without size limits  |  ⚠️  |  💡  |
|  no-exposed-error-details  | Security Operations |  CWE-209  |  SAS-9  |  4.3  |  Exposing internal error details in responses  |  ⚠️  |  💡  |

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  lambdaSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [lambdaSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **`recommended`** | Balanced security for Lambda projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                     |

---

## ⚙️ Configuration Options

All rules accept these common options:

```javascript
{
  rules: {
    'lambda-security/no-hardcoded-credentials-sdk': ['error', {
      allowInTests: true // Default: true - skip test files
    }],
    'lambda-security/no-secrets-in-env': ['error', {
      allowInTests: true,
      additionalPatterns: ['CUSTOM_SECRET_*'] // Additional patterns to detect
    }]
  }
}
```

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  // Baseline for all Lambda functions
  lambdaSecurity.configs.recommended,

  // Strict mode for payment/auth handlers
  {
    files: ['functions/payments/**', 'functions/auth/**'],
    ...lambdaSecurity.configs.strict,
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
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |
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
