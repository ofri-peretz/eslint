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
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-secure-coding" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-secure-coding" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides General secure coding practices and OWASP compliance for JavaScript/TypeScript.
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

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

## ⚙️ Configuration Presets

| Preset                | Description                                                     |
| :-------------------- | :-------------------------------------------------------------- |
| `recommended`         | Balanced security for most projects (Web + key Mobile security) |
| `strict`              | Maximum security enforcement (all rules as errors)              |
| `owasp-top-10`        | OWASP Top 10 Web 2021 compliance focused                        |
| `owasp-mobile-top-10` | OWASP Mobile Top 10 2024 compliance focused                     |

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
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.         |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it. |

| Rule                                                                                                                                         |   CWE    | OWASP | CVSS | Description                                                             | 🧠 | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :---------------------------------------------------------------------- | :---: | :-: | :-: | :-: | :-: | :-: |
| [detect-non-literal-regexp](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-non-literal-regexp)               | CWE-400  |       | 7.5  | ESLint security rule documentation for detect-non-literal-regexp        | 🟢 |     | ⚠️  |     |     |     |
| [detect-object-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-object-injection)                   | CWE-915  |       | 7.3  | ESLint security rule documentation for detect-object-injection          | 🟡 |     | ⚠️  |     |     |     |
| [detect-weak-password-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-weak-password-validation)   | CWE-521  |       | 7.5  | ESLint security rule documentation for detect-weak-password-validation  | 🟢 |     |     |     |     |     |
| [no-directive-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-directive-injection)                     |  CWE-94  |       | 8.8  | ESLint security rule documentation for no-directive-injection           | 🟢 | 💼  |     |     |     |     |
| [no-electron-security-issues](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-electron-security-issues)           | CWE-693  |       | 8.8  | ESLint security rule documentation for no-electron-security-issues      | 🟢 | 💼  |     |     |     |     |
| [no-format-string-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-format-string-injection)             | CWE-134  |       | 9.8  | ESLint security rule documentation for no-format-string-injection       | 🟢 | 💼  |     |     |     |     |
| [no-graphql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-graphql-injection)                         | CWE-943  |       | 8.6  | ESLint security rule documentation for no-graphql-injection             | 🟢 | 💼  |     |     |     |     |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials)                 | CWE-798  |       | 7.5  | ESLint security rule documentation for no-hardcoded-credentials         | 🟢 | 💼  |     | 🔧  | 💡  |     |
| [no-hardcoded-session-tokens](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-session-tokens)           | CWE-798  |       | 9.8  | ESLint security rule documentation for no-hardcoded-session-tokens      | 🟢 | 💼  |     |     |     |     |
| [no-improper-sanitization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-sanitization)                 | CWE-116  |       | 7.5  | ESLint security rule documentation for no-improper-sanitization         | 🟢 | 💼  |     |     |     |     |
| [no-improper-type-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-type-validation)           |  CWE-20  |       | 5.3  | ESLint security rule documentation for no-improper-type-validation      | 🟢 |     | ⚠️  |     |     |     |
| [no-insecure-comparison](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-insecure-comparison)                     | CWE-697  |       | 5.3  | ESLint security rule documentation for no-insecure-comparison           | 🟢 |     | ⚠️  | 🔧  |     | 🚫  |
| [no-ldap-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-ldap-injection)                               |  CWE-90  |       | 9.8  | ESLint security rule documentation for no-ldap-injection                | 🟢 | 💼  |     |     |     |     |
| [no-missing-authentication](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-missing-authentication)               | CWE-306  |       | 9.8  | ESLint security rule documentation for no-missing-authentication        | 🟢 |     | ⚠️  |     |     |     |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-pii-in-logs)                                     | CWE-532  |       | 7.5  | Enforce no pii in logs                                                  | 🟢 |     | ⚠️  |     |     |     |
| [no-privilege-escalation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-privilege-escalation)                   | CWE-269  |       | 8.8  | ESLint security rule documentation for no-privilege-escalation          | 🟢 |     | ⚠️  |     |     |     |
| [no-redos-vulnerable-regex](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-redos-vulnerable-regex)               | CWE-1333 |       | 7.5  | ESLint security rule documentation for no-redos-vulnerable-regex        | 🟢 | 💼  |     |     | 💡  |     |
| [no-sensitive-data-exposure](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sensitive-data-exposure)             | CWE-532  |       | 5.5  | ESLint security rule documentation for no-sensitive-data-exposure       | 🟢 |     | ⚠️  |     | 💡  |     |
| [no-unchecked-loop-condition](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unchecked-loop-condition)           | CWE-835  |       | 7.5  | ESLint security rule documentation for no-unchecked-loop-condition      | 🟢 | 💼  |     |     |     |     |
| [no-unlimited-resource-allocation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unlimited-resource-allocation) | CWE-770  |       | 7.5  | ESLint security rule documentation for no-unlimited-resource-allocation | 🟢 | 💼  |     |     |     |     |
| [no-unsafe-deserialization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-deserialization)               | CWE-502  |       | 9.8  | ESLint security rule documentation for no-unsafe-deserialization        | 🟢 | 💼  |     |     |     |     |
| [no-unsafe-regex-construction](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-regex-construction)         | CWE-400  |       | 7.5  | ESLint security rule documentation for no-unsafe-regex-construction     | 🟢 |     | ⚠️  |     | 💡  |     |
| [no-weak-password-recovery](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-weak-password-recovery)               | CWE-640  |       | 9.8  | ESLint security rule documentation for no-weak-password-recovery        | 🟢 | 💼  |     |     |     |     |
| [no-xpath-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xpath-injection)                             | CWE-643  |       | 9.8  | ESLint security rule documentation for no-xpath-injection               | 🟢 | 💼  |     |     |     |     |
| [no-xxe-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xxe-injection)                                 | CWE-611  |       | 9.1  | ESLint security rule documentation for no-xxe-injection                 | 🟢 | 💼  |     |     |     |     |
| [require-backend-authorization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-backend-authorization)       |          |       |      | ESLint security rule documentation for require-backend-authorization    | 🟢 |     |     |     |     |     |
| [require-secure-defaults](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-secure-defaults)                   | CWE-276  |       | 7.5  | ESLint security rule documentation for require-secure-defaults          | 🟢 |     |     |     |     |     |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)   | MongoDB security best practices.            |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
