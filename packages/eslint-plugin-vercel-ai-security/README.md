# eslint-plugin-vercel-ai-security

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security.svg)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=vercel-ai-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=vercel-ai-security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/vercel-ai-security](https://eslint.interlace.tools/docs/vercel-ai-security)
>
> **Note:** ASI06 (Memory Corruption) is N/A for TypeScript/JavaScript as these are memory-safe languages.

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Security rules for Vercel AI SDK usage.

## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

Security rules for Vercel AI SDK usage.

## Description

## Getting Started

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

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

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                                                                              | General |  Tag      |    CWE    |   OWASP   |   CVSS    |  Description  |               💼               |    ⚠️     |   🔧    |  💡   |                              🚫                               |
|  [require-validated-prompt](./docs/rules/require-validated-prompt.md)              | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-74   |  LLM01  |  9.0  |         Prevent prompt injection via input validation         |  💼   |
|  [no-sensitive-in-prompt](./docs/rules/no-sensitive-in-prompt.md)                  | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-200  |  LLM02  |  8.0  |       Prevent sensitive data (secrets, PII) in prompts        |  💼   |
|  [no-training-data-exposure](./docs/rules/no-training-data-exposure.md)            | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-359  |  LLM03  |  7.0  |       Prevent user data exposure to training endpoints        |  ⚠️   |
|  [require-request-timeout](./docs/rules/require-request-timeout.md)                | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-400  |  LLM04  |  5.0  |         Require timeouts for AI calls to prevent DoS          |  ⚠️   |
|  [no-unsafe-output-handling](./docs/rules/no-unsafe-output-handling.md)            | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-94   |  LLM05  |  9.8  |       Prevent unsafe use of AI output (eval, SQL, HTML)       |  💼   |
|  [require-tool-confirmation](./docs/rules/require-tool-confirmation.md)            | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-862  |  LLM06  |  7.0  |        Require confirmation for destructive tool usage        |  💼   |
|  [no-system-prompt-leak](./docs/rules/no-system-prompt-leak.md)                    | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-200  |  LLM07  |  7.5  |          Prevent system prompt leakage in responses           |  💼   |
|  [require-embedding-validation](./docs/rules/require-embedding-validation.md)      | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-20   |  LLM08  |  5.5  |           Validate embeddings before storage/search           |  💡   |
|  [require-output-validation](./docs/rules/require-output-validation.md)            | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-707  |  LLM09  |  5.0  |  Validate AI output before display to prevent misinformation  |  💡   |
|  [require-max-tokens](./docs/rules/require-max-tokens.md)                          | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-770  |  LLM10  |  6.5  |        Require `maxTokens` limit to prevent exhaustion        |  ⚠️   |
|  [require-max-steps](./docs/rules/require-max-steps.md)                            | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-834  |  LLM10  |  6.5  |            Require `maxSteps` for multi-step tools            |  ⚠️   |
|  [require-abort-signal](./docs/rules/require-abort-signal.md)                      | General |  General  |  General  |  General  |  General  |  General      |    🛡️ OWASP LLM Top 10 2025    |  CWE-404  |  LLM10  |  4.0  |         Require `abortSignal` for cancellable streams         |  💡   |
|  [no-dynamic-system-prompt](./docs/rules/no-dynamic-system-prompt.md)              | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-74   |  ASI01  |  8.0  |       Prevent dynamic system prompts (Agent Confusion)        |  💼   |
|  [require-tool-schema](./docs/rules/require-tool-schema.md)                        | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-20   |  ASI02  |  7.5  |          Require Zod schemas for all tool parameters          |  ⚠️   |
|  [no-hardcoded-api-keys](./docs/rules/no-hardcoded-api-keys.md)                    | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-798  |  ASI03  |  8.5  |          Prevent hardcoded API keys in configuration          |  💼   |
|  [require-output-filtering](./docs/rules/require-output-filtering.md)              | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-200  |  ASI04  |  6.5  |            Filter sensitive data returned by tools            |  ⚠️   |
|  [no-unsafe-output-handling](./docs/rules/no-unsafe-output-handling.md)            | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-94   |  ASI05  |  9.8  |       Prevent unexpected code execution from AI output        |  💼   |
|  **ASI06: Memory Corruption**                                                      | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |     -     |  ASI06  |   -   |             _N/A (TypeScript/JS is memory-safe)_              |  -    |  -    |  -    |
|  [require-rag-content-validation](./docs/rules/require-rag-content-validation.md)  | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-74   |  ASI07  |  6.0  |          Validate RAG content before use in prompts           |  ⚠️   |
|  [require-error-handling](./docs/rules/require-error-handling.md)                  | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-755  |  ASI08  |  5.0  |     Require error handling to prevent cascading failures      |  💡   |
|  [require-tool-confirmation](./docs/rules/require-tool-confirmation.md)            | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-862  |  ASI09  |  7.0  |        Require human-in-the-loop for sensitive actions        |  💼   |
|  [require-audit-logging](./docs/rules/require-audit-logging.md)                    | General |  General  |  General  |  General  |  General  |  General      |  🤖 OWASP Agentic Top 10 2026  |  CWE-778  |  ASI10  |  4.0  |            Suggest audit logging for AI operations            |  💡   |

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

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                           | Downloads | Description |
| :----------------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)       |           |             |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                           |           |             |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                     |           |             |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                             |           |             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |           |             |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)   |           |             |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)   |           |             |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)           |           |             |

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

<a href="https://eslint.interlace.tools/docs/vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>