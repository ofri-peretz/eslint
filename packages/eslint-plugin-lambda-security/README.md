<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security best practices for AWS Lambda functions (IAM, timeouts, environment).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-lambda-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-lambda-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-lambda-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=lambda-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=lambda-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin secures your AWS Lambda functions by enforcing best practices related to IAM permissions, timeout configurations, and environment variable management. It proactively detects vulnerabilities such as over-permissive policies and insecure logging practices, helping you adhere to the Principle of Least Privilege. Implementing these checks ensures that your serverless architecture remains resilient and compliant with strict security standards.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/lambda-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/lambda-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/lambda-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/lambda-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/lambda-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/lambda-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-lambda-security --save-dev
```

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

## ⚙️ Configuration Presets

| Preset        | Description                                                            |
| :------------ | :--------------------------------------------------------------------- |
| `recommended` | Balanced security for Lambda projects (critical as error, others warn) |
| `strict`      | Maximum security enforcement (all rules as errors)                     |

## 📚 Supported Libraries

| Library                  | npm                                                                                                                                       | Downloads                                                                                                                                        | Detection              |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| `aws-lambda`             | [![npm](https://img.shields.io/npm/v/aws-lambda.svg?style=flat-square)](https://www.npmjs.com/package/aws-lambda)                         | [![downloads](https://img.shields.io/npm/dt/aws-lambda.svg?style=flat-square)](https://www.npmjs.com/package/aws-lambda)                         | IAM, Logging, Timeouts |
| `@aws-sdk/client-lambda` | [![npm](https://img.shields.io/npm/v/@aws-sdk/client-lambda.svg?style=flat-square)](https://www.npmjs.com/package/@aws-sdk/client-lambda) | [![downloads](https://img.shields.io/npm/dt/@aws-sdk/client-lambda.svg?style=flat-square)](https://www.npmjs.com/package/@aws-sdk/client-lambda) | Credential Safety      |
| `middy`                  | [![npm](https://img.shields.io/npm/v/@middy/core.svg?style=flat-square)](https://www.npmjs.com/package/@middy/core)                       | [![downloads](https://img.shields.io/npm/dt/@middy/core.svg?style=flat-square)](https://www.npmjs.com/package/@middy/core)                       | Middleware Security    |

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

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set towarn in recommended preset.                       |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                         |   CWE   | OWASP  | CVSS | Description                                                         | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------------------------------------------------------------------------------------------------- | :-----: | :----: | :--: | :------------------------------------------------------------------ | :-: | :-: | :-: | :-: | :-: |
| [no-hardcoded-credentials-sdk](https://eslint.interlace.tools/docs/lambda-security/rules/no-hardcoded-credentials-sdk)       | CWE-798 | SAS-02 | 9.8  | [no-hardcoded-credentials-sdk](#no-hardcoded-credentials-sdk)       | 💼  |     |     |     |     |
| [no-permissive-cors-response](https://eslint.interlace.tools/docs/lambda-security/rules/no-permissive-cors-response)         | CWE-942 | SAS-04 | 9.1  | [no-permissive-cors-response](#no-permissive-cors-response)         | 💼  |     | 🔧  |     |     |
| [no-permissive-cors-middy](https://eslint.interlace.tools/docs/lambda-security/rules/no-permissive-cors-middy)               | CWE-942 | SAS-04 | 9.1  | [no-permissive-cors-middy](#no-permissive-cors-middy)               | 💼  |     |     |     |     |
| [no-secrets-in-env](https://eslint.interlace.tools/docs/lambda-security/rules/no-secrets-in-env)                             | CWE-522 | SAS-03 | 9.8  | [no-secrets-in-env](#no-secrets-in-env)                             | 💼  |     |     |     |     |
| [no-env-logging](https://eslint.interlace.tools/docs/lambda-security/rules/no-env-logging)                                   | CWE-532 | SAS-03 | 7.5  | [no-env-logging](#no-env-logging)                                   | 💼  | ⚠️  |     |     |     |
| [no-error-swallowing](https://eslint.interlace.tools/docs/lambda-security/rules/no-error-swallowing)                         | CWE-391 | SAS-06 | 7.5  | [no-error-swallowing](#no-error-swallowing)                         | 💼  | ⚠️  |     |     |     |
| [require-timeout-handling](https://eslint.interlace.tools/docs/lambda-security/rules/require-timeout-handling)               | CWE-703 | SAS-07 | 7.5  | [require-timeout-handling](#require-timeout-handling)               | 💼  | ⚠️  |     |     |     |
| [no-unbounded-batch-processing](https://eslint.interlace.tools/docs/lambda-security/rules/no-unbounded-batch-processing)     | CWE-400 | SAS-07 | 7.5  | [no-unbounded-batch-processing](#no-unbounded-batch-processing)     | 💼  | ⚠️  |     |     |     |
| [no-unvalidated-event-body](https://eslint.interlace.tools/docs/lambda-security/rules/no-unvalidated-event-body)             | CWE-20  | SAS-01 | 7.5  | [no-unvalidated-event-body](#no-unvalidated-event-body)             | 💼  | ⚠️  |     |     |     |
| [no-missing-authorization-check](https://eslint.interlace.tools/docs/lambda-security/rules/no-missing-authorization-check)   | CWE-862 | SAS-05 | 7.5  | [no-missing-authorization-check](#no-missing-authorization-check)   | 💼  | ⚠️  |     |     |     |
| [no-exposed-error-details](https://eslint.interlace.tools/docs/lambda-security/rules/no-exposed-error-details)               | CWE-209 | SAS-09 | 7.5  | [no-exposed-error-details](#no-exposed-error-details)               | 💼  | ⚠️  |     |     |     |
| [no-user-controlled-requests](https://eslint.interlace.tools/docs/lambda-security/rules/no-user-controlled-requests)         | CWE-918 | SAS-08 | 9.8  | [no-user-controlled-requests](#no-user-controlled-requests)         | 💼  |     |     |     |     |
| [no-overly-permissive-iam-policy](https://eslint.interlace.tools/docs/lambda-security/rules/no-overly-permissive-iam-policy) | CWE-732 | SAS-05 | 9.8  | [no-overly-permissive-iam-policy](#no-overly-permissive-iam-policy) | 💼  |     |     |     |     |

---

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```bash
src/handlers/api.ts
  18:5   error  🔒 CWE-798 OWASP:SAS-2 CVSS:9.8 | Hardcoded AWS credentials detected | CRITICAL [SOC2,PCI-DSS]
                    Fix: Use credential provider chain or Lambda execution role | https://owasp.org/...
```

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

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules.               |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/lambda-security"><img src="https://eslint.interlace.tools/images/og-lambda-security.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
