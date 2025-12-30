# eslint-plugin-vercel-ai-security

> 🔒 **The Definitive Security Plugin for Vercel AI SDK** — Protect your AI applications from prompt injection, sensitive data leaks, and agentic vulnerabilities with **complete OWASP coverage**.

**eslint-plugin-vercel-ai-security** is a specialized ESLint plugin that provides **SDK-aware security rules** for the [Vercel AI SDK](https://sdk.vercel.ai/). Unlike generic AI security linters, this plugin has **full knowledge** of the AI SDK's API structure, enabling precise detection of security vulnerabilities in `generateText`, `streamText`, `generateObject`, `streamObject`, and tool definitions.

[![npm version](https://badge.fury.io/js/eslint-plugin-vercel-ai-security.svg)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=vercel_ai_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=vercel_ai_security)
[![OWASP LLM Coverage](https://img.shields.io/badge/OWASP%20LLM%202025-10%2F10-brightgreen)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
[![OWASP Agentic Coverage](https://img.shields.io/badge/OWASP%20Agentic%202026-9%2F10-brightgreen)](https://owasp.org)

---

## 💡 What you get

- **SDK-aware detection:** Full knowledge of `generateText`, `streamText`, `generateObject`, `streamObject`, and tool definitions for precise vulnerability detection.
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Complete OWASP coverage:** 100% of OWASP LLM Top 10 2025 + 90% of OWASP Agentic Top 10 2026.
- **Tiered presets:** `recommended`, `strict`, `minimal` for fast policy rollout.
- **Zero false positives:** SDK-specific detection eliminates generic pattern matching noise.

---

## 📊 OWASP Coverage Matrix

| Framework                     | Coverage     | Categories               |
| ----------------------------- | ------------ | ------------------------ |
| **OWASP LLM Top 10 2025**     | 10/10 (100%) | LLM01-LLM10              |
| **OWASP Agentic Top 10 2026** | 9/10 (90%)   | ASI01-ASI05, ASI07-ASI10 |

> **Note:** ASI06 (Memory Corruption) is N/A for TypeScript/JavaScript as these are memory-safe languages.

---

## 📦 Installation

```bash
# npm
npm install eslint-plugin-vercel-ai-security --save-dev

# pnpm
pnpm add -D eslint-plugin-vercel-ai-security

# yarn
yarn add -D eslint-plugin-vercel-ai-security
```

---

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import vercelAISecurity from 'eslint-plugin-vercel-ai-security';

export default [vercelAISecurity.configs.recommended];
```

### Available Presets

| Preset            | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| **`recommended`** | Balanced security: Critical rules as errors, high-priority as warnings. |
| **`strict`**      | Maximum security: All rules enabled as errors for production.           |
| **`minimal`**     | Gradual adoption: Only the 2 most critical rules.                       |

---

## 📋 Complete Rules Reference (19 Rules)

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 💡 = Suggestions

### 🛡️ OWASP LLM Top 10 2025 (10/10 ✅)

| Rule                                                                         | CWE     | OWASP | CVSS | Description                                                 | 💼  | ⚠️  | 💡  |
| :--------------------------------------------------------------------------- | :------ | :---- | :--- | :---------------------------------------------------------- | :-: | :-: | :-: |
| [require-validated-prompt](./docs/rules/require-validated-prompt.md)         | CWE-74  | LLM01 | 9.0  | Prevent prompt injection via input validation               | 💼  |     |     |
| [no-sensitive-in-prompt](./docs/rules/no-sensitive-in-prompt.md)             | CWE-200 | LLM02 | 8.0  | Prevent sensitive data (secrets, PII) in prompts            | 💼  |     |     |
| [no-training-data-exposure](./docs/rules/no-training-data-exposure.md)       | CWE-359 | LLM03 | 7.0  | Prevent user data exposure to training endpoints            |     | ⚠️  |     |
| [require-request-timeout](./docs/rules/require-request-timeout.md)           | CWE-400 | LLM04 | 5.0  | Require timeouts for AI calls to prevent DoS                |     | ⚠️  |     |
| [no-unsafe-output-handling](./docs/rules/no-unsafe-output-handling.md)       | CWE-94  | LLM05 | 9.8  | Prevent unsafe use of AI output (eval, SQL, HTML)           | 💼  |     |     |
| [require-tool-confirmation](./docs/rules/require-tool-confirmation.md)       | CWE-862 | LLM06 | 7.0  | Require confirmation for destructive tool usage             | 💼  |     |     |
| [no-system-prompt-leak](./docs/rules/no-system-prompt-leak.md)               | CWE-200 | LLM07 | 7.5  | Prevent system prompt leakage in responses                  | 💼  |     |     |
| [require-embedding-validation](./docs/rules/require-embedding-validation.md) | CWE-20  | LLM08 | 5.5  | Validate embeddings before storage/search                   |     |     | 💡  |
| [require-output-validation](./docs/rules/require-output-validation.md)       | CWE-707 | LLM09 | 5.0  | Validate AI output before display to prevent misinformation |     |     | 💡  |
| [require-max-tokens](./docs/rules/require-max-tokens.md)                     | CWE-770 | LLM10 | 6.5  | Require `maxTokens` limit to prevent exhaustion             |     | ⚠️  |     |
| [require-max-steps](./docs/rules/require-max-steps.md)                       | CWE-834 | LLM10 | 6.5  | Require `maxSteps` for multi-step tools                     |     | ⚠️  |     |
| [require-abort-signal](./docs/rules/require-abort-signal.md)                 | CWE-404 | LLM10 | 4.0  | Require `abortSignal` for cancellable streams               |     |     | 💡  |

### 🤖 OWASP Agentic Top 10 2026 (9/10 ✅)

| Rule                                                                             | CWE     | OWASP | CVSS | Description                                          | 💼  | ⚠️  | 💡  |
| :------------------------------------------------------------------------------- | :------ | :---- | :--- | :--------------------------------------------------- | :-: | :-: | :-: |
| [no-dynamic-system-prompt](./docs/rules/no-dynamic-system-prompt.md)             | CWE-74  | ASI01 | 8.0  | Prevent dynamic system prompts (Agent Confusion)     | 💼  |     |     |
| [require-tool-schema](./docs/rules/require-tool-schema.md)                       | CWE-20  | ASI02 | 7.5  | Require Zod schemas for all tool parameters          |     | ⚠️  |     |
| [no-hardcoded-api-keys](./docs/rules/no-hardcoded-api-keys.md)                   | CWE-798 | ASI03 | 8.5  | Prevent hardcoded API keys in configuration          | 💼  |     |     |
| [require-output-filtering](./docs/rules/require-output-filtering.md)             | CWE-200 | ASI04 | 6.5  | Filter sensitive data returned by tools              |     | ⚠️  |     |
| [no-unsafe-output-handling](./docs/rules/no-unsafe-output-handling.md)           | CWE-94  | ASI05 | 9.8  | Prevent unexpected code execution from AI output     | 💼  |     |     |
| **ASI06: Memory Corruption**                                                     | -       | ASI06 | -    | _N/A (TypeScript/JS is memory-safe)_                 |  -  |  -  |  -  |
| [require-rag-content-validation](./docs/rules/require-rag-content-validation.md) | CWE-74  | ASI07 | 6.0  | Validate RAG content before use in prompts           |     | ⚠️  |     |
| [require-error-handling](./docs/rules/require-error-handling.md)                 | CWE-755 | ASI08 | 5.0  | Require error handling to prevent cascading failures |     |     | 💡  |
| [require-tool-confirmation](./docs/rules/require-tool-confirmation.md)           | CWE-862 | ASI09 | 7.0  | Require human-in-the-loop for sensitive actions      | 💼  |     |     |
| [require-audit-logging](./docs/rules/require-audit-logging.md)                   | CWE-778 | ASI10 | 4.0  | Suggest audit logging for AI operations              |     |     | 💡  |

---

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

## 🔗 Related ESLint Plugins

Part of the **Forge-JS ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                     | Description                                                  | Rules |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Universal security (OWASP Top 10 Web + Mobile)               |  89   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                     | JWT security (algorithm confusion, weak secrets, claims)     |  13   |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)               | Cryptographic best practices (weak algorithms, key handling) |  24   |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                       | PostgreSQL/node-postgres security                            |  13   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     | High-performance import linting                              |  12   |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

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
