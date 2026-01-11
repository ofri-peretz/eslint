# eslint-plugin-vercel-ai-security

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage (prompt injection, data handling).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=vercel-ai-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=vercel-ai-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

Security rules for Vercel AI SDK usage (prompt injection, data handling).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/vercel-ai-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/vercel-ai-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/vercel-ai-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/vercel-ai-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

## 🔧 Supported AI SDK Functions
| Function               | Full Coverage                  |
| ---------------------- | ------------------------------ |
| `generateText`         | ✅ All 19 rules                |
| `streamText`           | ✅ All 19 rules + abort signal |
| `generateObject`       | ✅ All 19 rules                |
| `streamObject`         | ✅ All 19 rules + abort signal |
| `tool()` helper        | ✅ Schema validation           |
| `embed()` / embeddings | ✅ Embedding validation        |

---

## 📊 Test Coverage
| Metric        | Coverage |
| ------------- | -------- |
| **Rules**     | 19       |
| **Tests**     | 200      |
| **Lines**     | 98%+     |
| **Functions** | 100%     |

---

## 🤖 AI-Agent Optimized Messages
All rule messages follow a structured format optimized for AI coding assistants:

```
🔒 CWE-74 OWASP:A03-Injection CVSS:9 | Unsafe Prompt | CRITICAL [SOC2,GDPR]
   Fix: Validate input before use | https://owasp.org/...
```

---

## 📦 Compatibility
| Package              | Version                        |
| -------------------- | ------------------------------ |
| `ai` (Vercel AI SDK) | ^3.0.0 \|\| ^4.0.0 \|\| ^5.0.0 |
| ESLint               | ^8.0.0 \|\| ^9.0.0             |
| Node.js              | ^18.0.0                        |

---

## 🙋 FAQ
### What's the difference between this and generic AI security linters?

Generic linters guess at patterns. This plugin knows the **exact** Vercel AI SDK API.

### Does this work with ESLint 9 Flat Config?

Yes! Designed specifically for ESLint Flat Config.

### How do I suppress a rule for a specific line?

```typescript
// eslint-disable-next-line vercel-ai-security/require-validated-prompt
await generateText({ prompt: internalPrompt });
```

### Why is ASI06 (Memory Corruption) not covered?

TypeScript/JavaScript are memory-safe languages. Memory corruption vulnerabilities (buffer overflows, use-after-free, etc.) are not possible in these environments.

<a href="https://eslint.interlace.tools/docs/vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [ESLint](https://eslint.interlace.tools/docs/vercel-ai-security/rules/ESLint) |  |  |  | ^8.0.0 \ |  |  |  |  |  |
| [require-validated-prompt](./docs/rules/require-validated-prompt.md) | CWE-74 |  | 9.0 | 🛡️ OWASP LLM Top 10 2025 | 💼 |  |  |  |  |
| [no-sensitive-in-prompt](./docs/rules/no-sensitive-in-prompt.md) | CWE-200 |  | 8.0 | 🛡️ OWASP LLM Top 10 2025 | 💼 |  |  |  |  |
| [no-training-data-exposure](./docs/rules/no-training-data-exposure.md) | CWE-359 |  | 7.0 | 🛡️ OWASP LLM Top 10 2025 |  | ⚠️ |  |  |  |
| [require-request-timeout](./docs/rules/require-request-timeout.md) | CWE-400 |  | 5.0 | 🛡️ OWASP LLM Top 10 2025 |  | ⚠️ |  |  |  |
| [no-unsafe-output-handling](./docs/rules/no-unsafe-output-handling.md) | CWE-94 |  | 9.8 | 🛡️ OWASP LLM Top 10 2025 | 💼 |  |  |  |  |
| [require-tool-confirmation](./docs/rules/require-tool-confirmation.md) | CWE-862 |  | 7.0 | 🛡️ OWASP LLM Top 10 2025 | 💼 |  |  |  |  |
| [no-system-prompt-leak](./docs/rules/no-system-prompt-leak.md) | CWE-200 |  | 7.5 | 🛡️ OWASP LLM Top 10 2025 | 💼 |  |  |  |  |
| [require-embedding-validation](./docs/rules/require-embedding-validation.md) | CWE-20 |  | 5.5 | 🛡️ OWASP LLM Top 10 2025 |  |  |  | 💡 |  |
| [require-output-validation](./docs/rules/require-output-validation.md) | CWE-707 |  | 5.0 | 🛡️ OWASP LLM Top 10 2025 |  |  |  | 💡 |  |
| [require-max-tokens](./docs/rules/require-max-tokens.md) | CWE-770 |  | 6.5 | 🛡️ OWASP LLM Top 10 2025 |  | ⚠️ |  |  |  |
| [require-max-steps](./docs/rules/require-max-steps.md) | CWE-834 |  | 6.5 | 🛡️ OWASP LLM Top 10 2025 |  | ⚠️ |  |  |  |
| [require-abort-signal](./docs/rules/require-abort-signal.md) | CWE-404 |  | 4.0 | 🛡️ OWASP LLM Top 10 2025 |  |  |  | 💡 |  |
| [no-dynamic-system-prompt](./docs/rules/no-dynamic-system-prompt.md) | CWE-74 |  | 8.0 | 🤖 OWASP Agentic Top 10 2026 | 💼 |  |  |  |  |
| [require-tool-schema](./docs/rules/require-tool-schema.md) | CWE-20 |  | 7.5 | 🤖 OWASP Agentic Top 10 2026 |  | ⚠️ |  |  |  |
| [no-hardcoded-api-keys](./docs/rules/no-hardcoded-api-keys.md) | CWE-798 |  | 8.5 | 🤖 OWASP Agentic Top 10 2026 | 💼 |  |  |  |  |
| [require-output-filtering](./docs/rules/require-output-filtering.md) | CWE-200 |  | 6.5 | 🤖 OWASP Agentic Top 10 2026 |  | ⚠️ |  |  |  |
| [require-rag-content-validation](./docs/rules/require-rag-content-validation.md) | CWE-74 |  | 6.0 | 🤖 OWASP Agentic Top 10 2026 |  | ⚠️ |  |  |  |
| [require-error-handling](./docs/rules/require-error-handling.md) | CWE-755 |  | 5.0 | 🤖 OWASP Agentic Top 10 2026 |  |  |  | 💡 |  |
| [require-audit-logging](./docs/rules/require-audit-logging.md) | CWE-778 |  | 4.0 | 🤖 OWASP Agentic Top 10 2026 |  |  |  | 💡 |  |
| [Plugin](https://eslint.interlace.tools/docs/vercel-ai-security/rules/Plugin) |  |  |  | Description |  |  |  |  |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | NPM | Downloads | License | Description |
| :--- | :---: | :---: | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![npm](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![license](https://img.shields.io/npm/l/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![npm](https://img.shields.io/npm/v/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![license](https://img.shields.io/npm/l/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![npm](https://img.shields.io/npm/v/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![license](https://img.shields.io/npm/l/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![npm](https://img.shields.io/npm/v/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![license](https://img.shields.io/npm/l/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![npm](https://img.shields.io/npm/v/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![license](https://img.shields.io/npm/l/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-vercel-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>