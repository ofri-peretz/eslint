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
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-lambda-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-lambda-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security best practices for AWS Lambda functions (IAM, timeouts, environment).
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-lambda-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-lambda-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-lambda-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-lambda-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-lambda-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-lambda-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-lambda-security --save-dev
```

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

## 🤖 AI-Optimized Messages

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

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## 💡 What You Get

- **Serverless-focused coverage:** 5 rules targeting Lambda-specific vulnerabilities (credentials, CORS, secrets, logging).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Serverless Top 10, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict` for fast policy rollout.
- **Framework-aware:** Detects Middy middleware, API Gateway response patterns, AWS SDK v3 clients.
- **Low false positive rate:** Context-aware detection with production heuristics.

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

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-env-logging](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-env-logging) | CWE-532 | A09:2021 |  | Detect logging of process.env which may expose secrets | 🟢 |  | ⚠️ |  |  |  |
| [no-error-swallowing](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-error-swallowing) | CWE-390 | A09:2021 |  | Detect empty catch blocks and missing error logging | 🟢 |  | ⚠️ |  |  |  |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-exposed-debug-endpoints) | CWE-489 | A05:2021 |  | Detect debug endpoints without authentication in Lambda handlers | 🟢 | 💼 |  |  |  |  |
| [no-exposed-error-details](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-exposed-error-details) | CWE-209 | A01:2021 |  | Detect Lambda handlers exposing internal error details in responses | 🟢 |  | ⚠️ |  |  |  |
| [no-hardcoded-credentials-sdk](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-hardcoded-credentials-sdk) | CWE-798 |  |  | Detects hardcoded AWS credentials in SDK client configurations | 🟢 | 💼 |  |  |  |  |
| [no-missing-authorization-check](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-missing-authorization-check) |  |  |  | Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-opti… | 🟢 |  | ⚠️ |  |  |  |
| [no-overly-permissive-iam-policy](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-overly-permissive-iam-policy) | CWE-732 |  |  | Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-opti… | 🟢 | 💼 |  |  |  |  |
| [no-permissive-cors-middy](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-permissive-cors-middy) | CWE-942 |  |  | Detects permissive CORS configurations in Middy middleware | 🟢 | 💼 |  |  |  |  |
| [no-permissive-cors-response](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-permissive-cors-response) | CWE-942 |  |  | Detects permissive CORS headers in Lambda API Gateway responses | 🟢 | 💼 |  |  |  |  |
| [no-secrets-in-env](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-secrets-in-env) | CWE-798 |  |  | Detects secrets defined directly in environment variable configurations | 🟢 | 💼 |  |  |  |  |
| [no-unbounded-batch-processing](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-unbounded-batch-processing) | CWE-770 |  |  | Detect processing batch records without size validation | 🟢 |  | ⚠️ |  |  |  |
| [no-unvalidated-event-body](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-unvalidated-event-body) | CWE-20 | A03:2021 |  | Detect Lambda handlers using event body without validation | 🟢 |  | ⚠️ |  |  |  |
| [no-user-controlled-requests](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-user-controlled-requests) | CWE-918 | A10:2021 |  | Detect HTTP requests with user-controlled URLs (SSRF) | 🟢 | 💼 |  |  |  |  |
| [require-timeout-handling](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/require-timeout-handling) | CWE-400 |  |  | Require timeout handling in Lambda handlers with external calls | 🟢 |  | ⚠️ |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-lambda-security"><img src="https://eslint.interlace.tools/images/og-lambda-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>