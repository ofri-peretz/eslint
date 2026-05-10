<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin for Node.js built-in modules (fs, child_process, vm, crypto, Buffer).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-node-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-node-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-node-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-node-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security rules for Node.js core modules (fs, child_process, crypto, etc).
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-node-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-node-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-node-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-node-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-node-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-node-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-node-security --save-dev
```

## 💡 What You Get
- **31 security rules** covering Node.js core module vulnerabilities
- **Command Injection Detection** for `child_process.exec`, `spawn`, and `execFile`
- **Path Traversal Prevention** for `fs` module operations
- **TOCTOU Race Condition Detection** for file system operations
- **Cryptographic Security** for weak algorithms and key management
- **LLM-optimized messages** with CWE references and fix guidance

## ⚙️ Configuration Presets
| Preset        | Description                                           |
| :------------ | :---------------------------------------------------- |
| `recommended` | Balanced security for most Node.js projects           |
| `strict`      | Maximum security enforcement (all rules as errors)    |
| `fs-security` | Focus on file system vulnerabilities (CWE-22, CWE-73) |
| `crypto`      | Cryptographic security rules only                     |

---

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

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [detect-child-process](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-child-process) | CWE-78 |  | 9.8 | ESLint rule documentation for detect-child-process | 🟢 | 💼 |  |  | 💡 |  |
| [detect-eval-with-expression](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-eval-with-expression) | CWE-95 |  | 9.8 | ESLint rule documentation for detect-eval-with-expression | 🟢 | 💼 |  |  |  |  |
| [detect-non-literal-fs-filename](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-non-literal-fs-filename) | CWE-22 |  | 7.5 | ESLint rule documentation for detect-non-literal-fs-filename | 🟢 | 💼 |  |  | 💡 |  |
| [detect-suspicious-dependencies](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-suspicious-dependencies) | CWE-829 |  | 8.2 | ESLint rule documentation for detect-suspicious-dependencies | 🟢 | 💼 |  |  |  |  |
| [lock-file](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/lock-file) | CWE-829 |  | 7.5 | ESLint rule documentation for lock-file | 🟢 | 💼 |  |  |  |  |
| [no-arbitrary-file-access](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-arbitrary-file-access) | CWE-22 |  | 7.5 | ESLint rule documentation for no-arbitrary-file-access | 🟢 | 💼 |  |  |  |  |
| [no-buffer-overread](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-buffer-overread) | CWE-126 |  | 7.5 | ESLint rule documentation for no-buffer-overread | 🟢 | 💼 |  |  |  |  |
| [no-cryptojs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs) | CWE-327 |  | 5.0 | ESLint rule documentation for no-cryptojs | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-cryptojs-weak-random](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs-weak-random) | CWE-338 |  | 5.3 | ESLint rule documentation for no-cryptojs-weak-random | 🟢 | 💼 |  |  | 💡 |  |
| [no-data-in-temp-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-data-in-temp-storage) | CWE-312 |  | 7.5 | ESLint rule documentation for no-data-in-temp-storage | 🟢 |  | ⚠️ |  |  |  |
| [no-deprecated-cipher-method](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-deprecated-cipher-method) | CWE-327 |  | 5.0 | ESLint rule documentation for no-deprecated-cipher-method | 🟢 | 💼 |  |  | 💡 |  |
| [no-dynamic-dependency-loading](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-dependency-loading) | CWE-829 |  | 7.5 | ESLint rule documentation for no-dynamic-dependency-loading | 🟢 |  | ⚠️ |  |  |  |
| [no-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-require) | CWE-706 |  | 7.5 | ESLint rule documentation for no-dynamic-require | 🟢 |  | ⚠️ |  |  |  |
| [no-ecb-mode](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-ecb-mode) | CWE-327 |  | 7.5 | ESLint rule documentation for no-ecb-mode | 🟢 | 💼 |  |  | 💡 |  |
| [no-insecure-key-derivation](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-key-derivation) | CWE-916 |  | 7.5 | ESLint rule documentation for no-insecure-key-derivation | 🟢 | 💼 |  |  | 💡 |  |
| [no-insecure-rsa-padding](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-rsa-padding) | CWE-327 |  | 7.4 | ESLint rule documentation for no-insecure-rsa-padding | 🟢 | 💼 |  |  | 💡 |  |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-pii-in-logs) | CWE-532 |  | 7.5 | ESLint rule documentation for no-pii-in-logs | 🟢 |  | ⚠️ |  |  |  |
| [no-self-signed-certs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-self-signed-certs) | CWE-295 |  | 7.5 | ESLint rule documentation for no-self-signed-certs | 🟢 | 💼 |  |  | 💡 |  |
| [no-sha1-hash](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-sha1-hash) | CWE-327 |  | 7.5 | ESLint rule documentation for no-sha1-hash | 🟢 | 💼 |  |  | 💡 |  |
| [no-static-iv](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-static-iv) | CWE-329 |  | 7.5 | ESLint rule documentation for no-static-iv | 🟢 | 💼 |  |  | 💡 |  |
| [no-timing-unsafe-compare](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-timing-unsafe-compare) | CWE-208 |  | 5.9 | ESLint rule documentation for no-timing-unsafe-compare | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-toctou-vulnerability](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-toctou-vulnerability) | CWE-367 |  | 7.0 | ESLint rule documentation for no-toctou-vulnerability | 🟢 | 💼 |  |  | 💡 |  |
| [no-unsafe-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unsafe-dynamic-require) | CWE-706 |  | 7.5 | ESLint rule documentation for no-unsafe-dynamic-require | 🟢 | 💼 |  |  | 💡 |  |
| [no-weak-cipher-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-cipher-algorithm) | CWE-327 |  | 7.5 | ESLint rule documentation for no-weak-cipher-algorithm | 🟢 | 💼 |  |  | 💡 |  |
| [no-weak-hash-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-hash-algorithm) | CWE-327 |  | 7.5 | ESLint rule documentation for no-weak-hash-algorithm | 🟢 | 💼 |  |  | 💡 |  |
| [no-zip-slip](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-zip-slip) | CWE-22 |  | 8.1 | ESLint rule documentation for no-zip-slip | 🟢 | 💼 |  |  |  |  |
| [prefer-native-crypto](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/prefer-native-crypto) | CWE-327 |  | 5.0 | ESLint rule documentation for prefer-native-crypto | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [require-dependency-integrity](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-dependency-integrity) | CWE-494 |  | 7.5 | ESLint rule documentation for require-dependency-integrity | 🟢 |  |  |  |  |  |
| [require-secure-credential-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-credential-storage) | CWE-522 |  | 7.5 | ESLint rule documentation for require-secure-credential-storage | 🟢 |  |  |  |  |  |
| [require-secure-deletion](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-deletion) | CWE-459 |  | 7.5 | ESLint rule documentation for require-secure-deletion | 🟢 |  |  |  |  |  |
| [require-storage-encryption](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-storage-encryption) | CWE-311 |  | 7.5 | ESLint rule documentation for require-storage-encryption | 🟢 |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-node-security"><img src="https://eslint.interlace.tools/images/og-node-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>