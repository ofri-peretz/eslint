<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  General secure coding practices and OWASP compliance for JavaScript/TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=secure-coding" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=secure-coding" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides General secure coding practices and OWASP compliance for JavaScript/TypeScript.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-secure-coding), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-secure-coding), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-secure-coding) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-secure-coding)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-secure-coding), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-secure-coding)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-secure-coding --save-dev
```

## Benchmarks vs competitors (CWE-798 ground truth)
`no-hardcoded-credentials` is part of the [ILB-Flagship benchmark suite](../../benchmarks/suites/ilb-flagship). On the labeled CWE-798 fixture set (Juliet-style: 2 vulnerable + 2 safe files, ground-truthed):

| Rule | Precision | Recall | F1 |
| :--- | ---: | ---: | ---: |
| **`secure-coding/no-hardcoded-credentials`** (ours) | **100%** | **100%** | **1.00** |
| `eslint-plugin-no-secrets/no-secrets` | 100% | 50% | 0.67 |

The competitor's entropy-only detection catches the high-entropy API-key shape but misses the 15-character literal password assigned to `password:`. Our context-gated detection (structural patterns + credential-named-variable check + context-positive path) catches both for the right reasons.

**On real OSS (vercel/ai), the competitor reports ~380 more findings than us.** Those 380 are not catches we missed — they're entropy false-positives on TypeScript type literals (`'experimental_onLanguageModelCallStart'`), error class names (`'AI_ToolCallNotFoundForApprovalError'`), and documentation URLs. Sampling confirmed zero are actual credentials. The corpus number is the right one to weigh; the OSS finding-count is a noise metric.

## ⚙️ Configuration Presets
| Preset                | Description                                                     |
| :-------------------- | :-------------------------------------------------------------- |
| `recommended`         | Balanced security for most projects (Web + key Mobile security) |
| `strict`              | Maximum security enforcement (all rules as errors)              |
| `owasp-top-10`        | OWASP Top 10 Web 2021 compliance focused                        |
| `owasp-mobile-top-10` | OWASP Mobile Top 10 2024 compliance focused                     |

---

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [detect-non-literal-regexp](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-non-literal-regexp) | CWE-400 |  |  | Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expr… | 🟢 |  |  |  |  |  |
| [detect-object-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-object-injection) | CWE-915 |  |  | Detects variable[key] as a left- or right-hand assignment operand (prototype pollution) | 🟡 |  |  |  |  |  |
| [detect-weak-password-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-weak-password-validation) | CWE-521 | A07:2021 |  | Detects weak password length requirements (less than 8 characters) in validation code. | 🟢 |  |  |  |  |  |
| [no-directive-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-directive-injection) | CWE-94 |  |  | Detects directive injection vulnerabilities in template systems | 🟢 |  |  |  |  |  |
| [no-electron-security-issues](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-electron-security-issues) | CWE-16 |  |  | Detects Electron security vulnerabilities and insecure configurations | 🟢 |  |  |  |  |  |
| [no-format-string-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-format-string-injection) | CWE-134 |  |  | Detects format string injection vulnerabilities | 🟢 |  |  |  |  |  |
| [no-graphql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-graphql-injection) | CWE-943 |  |  | Detects GraphQL injection vulnerabilities and DoS attacks | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials) | CWE-798 |  |  | Detects hardcoded passwords, API keys, tokens, and other sensitive credentials in source code | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-session-tokens](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-session-tokens) | CWE-798 |  |  | This rule detects hardcoded JWT tokens (starting with eyJ), Bearer tokens, and session identifiers | 🟢 |  |  |  |  |  |
| [no-improper-sanitization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-sanitization) | CWE-116 |  |  | Detects improper sanitization of user input | 🟢 |  |  |  |  |  |
| [no-improper-type-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-type-validation) | CWE-1287 |  |  | Detects improper type validation in user input handling | 🟢 | 💼 |  |  |  |  |
| [no-insecure-comparison](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-insecure-comparison) | CWE-697 |  |  | Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-ldap-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-ldap-injection) | CWE-90 |  |  | Detects LDAP injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-missing-authentication](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-missing-authentication) | CWE-287 |  |  | CWE: [CWE-287](https://cwe.mitre.org/data/definitions/287.html) | 🟢 | 💼 |  |  |  |  |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-pii-in-logs) | CWE-359 |  |  | Prevent personally identifiable information (PII) — emails, SSNs, credit cards, phone numbers — from reachi… | 🟢 |  |  |  | 💡 |  |
| [no-privilege-escalation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-privilege-escalation) | CWE-269 |  |  | Detects potential privilege escalation vulnerabilities where user input is used to assign roles or permissi… | 🟢 | 💼 |  |  |  |  |
| [no-redos-vulnerable-regex](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-redos-vulnerable-regex) | CWE-400 |  |  | ESLint Rule: no-redos-vulnerable-regex | 🟢 |  |  |  |  |  |
| [no-sensitive-data-exposure](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sensitive-data-exposure) | CWE-532 |  |  | ESLint Rule: no-sensitive-data-exposure | 🟢 | 💼 |  |  |  |  |
| [no-unchecked-loop-condition](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unchecked-loop-condition) | CWE-400 |  |  | Detects unchecked loop conditions that could cause DoS | 🟢 |  |  |  |  |  |
| [no-unlimited-resource-allocation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unlimited-resource-allocation) | CWE-770 |  |  | Detects unlimited resource allocation that could cause DoS | 🟢 |  |  |  |  |  |
| [no-unsafe-deserialization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-deserialization) | CWE-502 |  |  | Detects unsafe deserialization of untrusted data | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-regex-construction](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-regex-construction) | CWE-400 |  |  | ESLint Rule: no-unsafe-regex-construction with LLM-optimized suggestions and auto-fix capabilities | 🟢 |  |  |  |  |  |
| [no-weak-password-recovery](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-weak-password-recovery) | CWE-640 |  |  | ESLint Rule: no-weak-password-recovery with LLM-optimized suggestions and auto-fix capabilities | 🟢 | 💼 |  |  |  |  |
| [no-xpath-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xpath-injection) | CWE-643 |  |  | Detects XPath injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-xxe-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xxe-injection) | CWE-611 |  |  | Detects XML External Entity (XXE) injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [require-backend-authorization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-backend-authorization) | CWE-602 |  |  | CWE: [CWE-602](https://cwe.mitre.org/data/definitions/602.html) | 🟢 |  |  |  |  |  |
| [require-secure-defaults](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-secure-defaults) | CWE-1188 |  |  | CWE: [CWE-1188](https://cwe.mitre.org/data/definitions/1188.html) | 🟢 |  |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>