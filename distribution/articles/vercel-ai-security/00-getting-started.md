---
title: 'Getting Started with eslint-plugin-vercel-ai-security'
published: false
description: 'AI application security in 60 seconds. 19 rules for prompt injection, data exfiltration, and agent safety.'
tags: ai, security, vercel, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-vercel-ai-security

**19 AI security rules. Prompt injection. Agent safety. OWASP LLM coverage.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-vercel-ai-security
```

## Flat Config

```javascript
// eslint.config.js
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [vercelAI.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/chat.ts
  8:3  error  🔒 CWE-77 OWASP:LLM01 | Unvalidated prompt input
              Risk: Prompt injection vulnerability
              Fix: Use validated prompt: sanitizePrompt(userInput)

src/agent.ts
  24:5 error  🔒 OWASP:LLM08 | Tool missing confirmation gate
              Risk: AI agent can execute arbitrary actions
              Fix: Add await requireUserConfirmation() before execution
```

## Rule Overview

| Category          | Rules | Examples                                       |
| ----------------- | ----- | ---------------------------------------------- |
| Prompt Injection  | 4     | Unvalidated input, dynamic system prompts      |
| Data Exfiltration | 3     | System prompt leaks, sensitive data in prompts |
| Agent Safety      | 3     | Missing tool confirmation, unlimited steps     |
| Resource Limits   | 4     | Token limits, timeouts, abort signals          |
| RAG Security      | 2     | Content validation, embedding verification     |
| Output Safety     | 3     | Output filtering, validation                   |

## Quick Wins

### Before

```javascript
// ❌ Prompt Injection Risk
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: userInput, // Unvalidated!
});
```

### After

```javascript
// ✅ Validated Input
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: sanitizePrompt(userInput),
  maxTokens: 1000,
  abortSignal: AbortSignal.timeout(30000),
});
```

### Before

```javascript
// ❌ Unlimited Agent
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: dangerousTools,
});
```

### After

```javascript
// ✅ Limited Agent
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: safeTools,
  maxSteps: 5,
});
```

## Available Presets

```javascript
// Security-focused configuration
vercelAI.configs.recommended;

// Full OWASP LLM Top 10 coverage
vercelAI.configs['owasp-llm-top-10'];
```

## OWASP LLM Top 10 Mapping

| OWASP LLM               | Rules                                                   |
| ----------------------- | ------------------------------------------------------- |
| LLM01: Prompt Injection | `require-validated-prompt`, `no-dynamic-system-prompt`  |
| LLM02: Insecure Output  | `require-output-filtering`, `no-unsafe-output-handling` |
| LLM04: Model DoS        | `require-max-tokens`, `require-abort-signal`            |
| LLM06: Sensitive Data   | `no-sensitive-in-prompt`, `no-system-prompt-leak`       |
| LLM07: Plugin Design    | `require-tool-schema`, `require-tool-confirmation`      |
| LLM08: Excessive Agency | `require-max-steps`, `require-tool-confirmation`        |

## Customizing Rules

```javascript
// eslint.config.js
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [
  vercelAI.configs.recommended,
  {
    rules: {
      // Configure max steps
      'vercel-ai/require-max-steps': ['error', { maxSteps: 10 }],

      // Make RAG validation a warning
      'vercel-ai/require-rag-content-validation': 'warn',
    },
  },
];
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-vercel-ai-security

# Config (eslint.config.js)
import vercelAI from 'eslint-plugin-vercel-ai-security';
export default [vercelAI.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-vercel-ai-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
📖 [OWASP LLM Mapping](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-vercel-ai-security#owasp-llm-top-10)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building with Vercel AI SDK? Star the repo!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
