# eslint-plugin-vercel-ai-security

> 🔒 **The Definitive Security Plugin for Vercel AI SDK** — Protect your AI applications from prompt injection, sensitive data leaks, and agentic vulnerabilities with **complete OWASP coverage**.

**eslint-plugin-vercel-ai-security** is a specialized ESLint plugin that provides **SDK-aware security rules** for the [Vercel AI SDK](https://sdk.vercel.ai/). Unlike generic AI security linters, this plugin has **full knowledge** of the AI SDK's API structure, enabling precise detection of security vulnerabilities in `generateText`, `streamText`, `generateObject`, `streamObject`, and tool definitions.

[![npm version](https://badge.fury.io/js/eslint-plugin-vercel-ai-security.svg)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OWASP LLM Coverage](https://img.shields.io/badge/OWASP%20LLM%202025-10%2F10-brightgreen)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
[![OWASP Agentic Coverage](https://img.shields.io/badge/OWASP%20Agentic%202026-9%2F10-brightgreen)](https://owasp.org)

---

## 🎯 Why Use This Plugin?

### The Problem

When building AI applications with the Vercel AI SDK, developers face unique security challenges:

- **Prompt Injection**: User input that manipulates AI behavior
- **System Prompt Leakage**: Exposing AI instructions to clients
- **Sensitive Data Leaks**: Accidentally passing secrets/PII to LLMs
- **Training Data Exposure**: User data sent to model training
- **Model DoS**: Unbounded requests without timeouts
- **Tool Misuse**: AI agents executing dangerous operations
- **RAG Poisoning**: Malicious documents injecting instructions
- **Misinformation**: AI output displayed without validation

### The Solution

This plugin provides **19 security rules** covering **100% of OWASP LLM Top 10 2025** and **90% of OWASP Agentic Top 10 2026** (the remaining 10% is N/A for TypeScript).

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

### Config Options

| Config        | Rules                 | Use Case         |
| ------------- | --------------------- | ---------------- |
| `minimal`     | 2                     | Gradual adoption |
| `recommended` | 14 (7 error, 7 warn)  | Most projects    |
| `strict`      | 19 (17 error, 2 warn) | Production       |

---

## 📋 Complete Rules Reference (19 Rules)

### 🛡️ OWASP LLM Top 10 2025 (10/10 ✅)

| OWASP                              | Rule                                                                                                                                                                                 | Severity    | Docs                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------- |
| **LLM01: Prompt Injection**        | [`require-validated-prompt`](./docs/rules/require-validated-prompt.md)                                                                                                               | 🔴 CRITICAL | [📖](./docs/rules/require-validated-prompt.md)     |
| **LLM02: Sensitive Info**          | [`no-sensitive-in-prompt`](./docs/rules/no-sensitive-in-prompt.md)                                                                                                                   | 🔴 CRITICAL | [📖](./docs/rules/no-sensitive-in-prompt.md)       |
| **LLM03: Training Data Poisoning** | [`no-training-data-exposure`](./docs/rules/no-training-data-exposure.md)                                                                                                             | 🟡 HIGH     | [📖](./docs/rules/no-training-data-exposure.md)    |
| **LLM04: Model DoS**               | [`require-request-timeout`](./docs/rules/require-request-timeout.md)                                                                                                                 | 🟡 MEDIUM   | [📖](./docs/rules/require-request-timeout.md)      |
| **LLM05: Output Handling**         | [`no-unsafe-output-handling`](./docs/rules/no-unsafe-output-handling.md)                                                                                                             | 🔴 CRITICAL | [📖](./docs/rules/no-unsafe-output-handling.md)    |
| **LLM06: Excessive Agency**        | [`require-tool-confirmation`](./docs/rules/require-tool-confirmation.md)                                                                                                             | 🔴 CRITICAL | [📖](./docs/rules/require-tool-confirmation.md)    |
| **LLM07: System Prompt Leak**      | [`no-system-prompt-leak`](./docs/rules/no-system-prompt-leak.md)                                                                                                                     | 🔴 CRITICAL | [📖](./docs/rules/no-system-prompt-leak.md)        |
| **LLM08: Vector Weaknesses**       | [`require-embedding-validation`](./docs/rules/require-embedding-validation.md)                                                                                                       | 🟡 MEDIUM   | [📖](./docs/rules/require-embedding-validation.md) |
| **LLM09: Misinformation**          | [`require-output-validation`](./docs/rules/require-output-validation.md)                                                                                                             | 🟡 MEDIUM   | [📖](./docs/rules/require-output-validation.md)    |
| **LLM10: Unbounded Consumption**   | [`require-max-tokens`](./docs/rules/require-max-tokens.md), [`require-max-steps`](./docs/rules/require-max-steps.md), [`require-abort-signal`](./docs/rules/require-abort-signal.md) | 🟡 HIGH     | [📖](./docs/rules/require-max-tokens.md)           |

### 🤖 OWASP Agentic Top 10 2026 (9/10 ✅)

| OWASP                         | Rule                                                                               | Severity    | Docs                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| **ASI01: Agent Confusion**    | [`no-dynamic-system-prompt`](./docs/rules/no-dynamic-system-prompt.md)             | 🔴 CRITICAL | [📖](./docs/rules/no-dynamic-system-prompt.md)       |
| **ASI02: Tool Misuse**        | [`require-tool-schema`](./docs/rules/require-tool-schema.md)                       | 🟡 HIGH     | [📖](./docs/rules/require-tool-schema.md)            |
| **ASI03: Identity Abuse**     | [`no-hardcoded-api-keys`](./docs/rules/no-hardcoded-api-keys.md)                   | 🔴 CRITICAL | [📖](./docs/rules/no-hardcoded-api-keys.md)          |
| **ASI04: Data Exfiltration**  | [`require-output-filtering`](./docs/rules/require-output-filtering.md)             | 🟡 HIGH     | [📖](./docs/rules/require-output-filtering.md)       |
| **ASI05: Code Execution**     | [`no-unsafe-output-handling`](./docs/rules/no-unsafe-output-handling.md)           | 🔴 CRITICAL | [📖](./docs/rules/no-unsafe-output-handling.md)      |
| **ASI06: Memory Corruption**  | ⚪ N/A                                                                             | -           | TypeScript is memory-safe                            |
| **ASI07: Poisoned RAG**       | [`require-rag-content-validation`](./docs/rules/require-rag-content-validation.md) | 🟡 HIGH     | [📖](./docs/rules/require-rag-content-validation.md) |
| **ASI08: Cascading Failures** | [`require-error-handling`](./docs/rules/require-error-handling.md)                 | 🟠 MEDIUM   | [📖](./docs/rules/require-error-handling.md)         |
| **ASI09: Human-Agent Trust**  | [`require-tool-confirmation`](./docs/rules/require-tool-confirmation.md)           | 🔴 CRITICAL | [📖](./docs/rules/require-tool-confirmation.md)      |
| **ASI10: Logging**            | [`require-audit-logging`](./docs/rules/require-audit-logging.md)                   | ⚪ LOW      | [📖](./docs/rules/require-audit-logging.md)          |

> **Note**: ASI06 (Memory Corruption) is not applicable to TypeScript/JavaScript as these languages are memory-safe by design.

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
