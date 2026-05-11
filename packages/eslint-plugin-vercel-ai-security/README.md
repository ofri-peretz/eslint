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
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security rules for Vercel AI SDK usage (prompt injection, data handling).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                              |
| :------------ | :--------------------------------------- |
| `recommended` | Balanced security (7 errors, 7 warnings) |
| `strict`      | Maximum security (17 errors, 2 warnings) |
| `minimal`     | Minimal config                           |

## 📚 Supported Libraries
| Library              | npm                                                                                               | Downloads                                                                                                | Detection                      |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `ai` (Vercel AI SDK) | [![npm](https://img.shields.io/npm/v/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai) | [![downloads](https://img.shields.io/npm/dt/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai) | Prompt Injection, Data Leakage |

## 🤖 AI-Agent Optimized Messages
All rule messages follow a structured format optimized for AI coding assistants:

```
🔒 CWE-74 OWASP:A03-Injection CVSS:9 | Unsafe Prompt | CRITICAL [SOC2,GDPR]
   Fix: Validate input before use | https://owasp.org/...
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## 🔧 Supported AI SDK Functions
| Function               | Full Coverage                  |
| ---------------------- | ------------------------------ |
| `generateText`         | ✅ All 19 rules                |
| `streamText`           | ✅ All 19 rules + abort signal |
| `generateObject`       | ✅ All 19 rules                |
| `streamObject`         | ✅ All 19 rules + abort signal |
| `tool()` helper        | ✅ Schema validation           |
| `embed()` / embeddings | ✅ Embedding validation        |

## 📊 Test Coverage
| Metric        | Coverage |
| ------------- | -------- |
| **Rules**     | 19       |
| **Tests**     | 200      |
| **Lines**     | 98%+     |
| **Functions** | 100%     |

## 🙋 FAQ
### What's the difference between this and generic AI security linters?

Generic linters guess at patterns. This plugin knows the **exact** Vercel AI SDK API.

### Does this work with ESLint 9 Flat Config?

Yes! Designed specifically for ESLint Flat Config — works on ESLint 8 (with flat config), 9, and 10. See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

### How do I suppress a rule for a specific line?

```typescript
// eslint-disable-next-line vercel-ai-security/require-validated-prompt
await generateText({ prompt: internalPrompt });
```

### Why is ASI06 (Memory Corruption) not covered?

TypeScript/JavaScript are memory-safe languages. Memory corruption vulnerabilities (buffer overflows, use-after-free, etc.) are not possible in these environments.

## 📦 Compatibility
| Package              | Version                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `ai` (Vercel AI SDK) | [![npm](https://img.shields.io/npm/v/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai)         |
| ESLint               | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js              | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/)       |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-dynamic-system-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-dynamic-system-prompt) | CWE-74 |  |  | This rule identifies code patterns where system prompts contain dynamic or user-controlled content | 🟢 |  |  |  |  |  |
| [no-hardcoded-api-keys](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-hardcoded-api-keys) | CWE-798 |  |  | This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK pro… | 🟢 |  |  |  |  |  |
| [no-sensitive-in-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-sensitive-in-prompt) | CWE-200 |  |  | This rule identifies code patterns where sensitive data like passwords, API keys, tokens, or personally ide… | 🟢 |  |  |  |  |  |
| [no-system-prompt-leak](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-system-prompt-leak) | CWE-200 |  |  | This rule identifies code patterns where system prompts or AI instructions are returned in API responses, l… | 🟢 |  |  |  |  |  |
| [no-training-data-exposure](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-training-data-exposure) | CWE-359 |  |  | This rule identifies code patterns where user data might be sent to LLM training endpoints or when training… | 🟢 |  |  |  |  |  |
| [no-unsafe-output-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-unsafe-output-handling) | CWE-94 |  |  | This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that… | 🟢 |  |  |  |  |  |
| [require-abort-signal](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-abort-signal) | CWE-404 |  |  | This rule identifies streaming AI SDK calls (streamText, streamObject) that don't include an AbortSignal fo… | 🟢 |  |  |  |  |  |
| [require-audit-logging](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-audit-logging) | CWE-778 |  |  | This rule identifies AI SDK calls that aren't preceded by logging statements | 🟢 |  |  |  |  |  |
| [require-embedding-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-embedding-validation) | CWE-20 |  |  | This rule identifies code patterns where embeddings are stored in vector databases without validation. | 🟢 |  |  |  |  |  |
| [require-error-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-error-handling) | CWE-755 |  |  | This rule identifies AI SDK calls that aren't wrapped in try-catch blocks | 🟢 |  |  |  |  |  |
| [require-max-steps](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-steps) | CWE-834 |  |  | This rule identifies AI SDK calls that use tools but don't specify a maxSteps limit | 🟢 |  |  |  |  |  |
| [require-max-tokens](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-tokens) | CWE-770 |  |  | This rule identifies AI SDK calls that don't specify a maxTokens limit | 🟢 |  |  |  |  |  |
| [require-output-filtering](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-filtering) | CWE-200 |  |  | This rule identifies tool execute functions that return raw data from data sources (databases, APIs, file s… | 🟢 |  |  |  |  |  |
| [require-output-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-validation) | CWE-707 |  |  | This rule identifies code patterns where AI-generated output is displayed to users without validation or fa… | 🟢 |  |  |  |  |  |
| [require-rag-content-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-rag-content-validation) | CWE-74 |  |  | This rule identifies code patterns where content retrieved from vector stores or document retrieval systems… | 🟢 |  |  |  |  |  |
| [require-request-timeout](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-request-timeout) | CWE-400 |  |  | This rule identifies AI SDK calls that don't have timeout or abort signal configuration. | 🟢 |  |  |  |  |  |
| [require-tool-confirmation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-confirmation) | CWE-862 |  |  | This rule identifies destructive tools (delete, transfer, execute, etc.) that don't require human confirmat… | 🟢 |  |  |  |  |  |
| [require-tool-schema](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-schema) | CWE-20 |  |  | Get weather | 🟢 |  |  |  |  |  |
| [require-validated-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-validated-prompt) | CWE-74 |  |  | This rule identifies code patterns where user-controlled input is passed directly to AI prompts without val… | 🟢 |  |  |  |  |  |
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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-vercel-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>