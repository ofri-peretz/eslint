---
title: 100% OWASP LLM Top 10 Coverage for Vercel AI SDK
published: true
description: A complete mapping of OWASP LLM Top 10 2025 categories to automated ESLint rules for the Vercel AI SDK
tags: ai, security, owasp, typescript
cover_image:
---

The OWASP LLM Top 10 2025 is here. And your **Vercel AI SDK** application probably violates half of it.

I know because I built a plugin to check. **One ESLint config. Full OWASP coverage. 60 seconds to install.**

> **This plugin is designed specifically for the Vercel AI SDK.** It understands `generateText`, `streamText`, `tool()`, and other SDK functions—not just pattern-matching on strings.

## The 10 Categories (And How to Automate Them)

| #     | OWASP Category           | What It Means                      | ESLint Rule                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM01 | Prompt Injection         | User input manipulates AI behavior | [`require-validated-prompt`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-validated-prompt.md)                                                                                                                                       |
| LLM02 | Sensitive Data Exposure  | Secrets/PII leaked to LLM          | [`no-sensitive-in-prompt`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-sensitive-in-prompt.md)                                                                                                                                           |
| LLM03 | Training Data Poisoning  | User data sent to training         | [`no-training-data-exposure`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-training-data-exposure.md)                                                                                                                                     |
| LLM04 | Model Denial of Service  | Unbounded requests cause outage    | [`require-request-timeout`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-request-timeout.md)                                                                                                                                         |
| LLM05 | Insecure Output Handling | AI output executed as code         | [`no-unsafe-output-handling`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-unsafe-output-handling.md)                                                                                                                                     |
| LLM06 | Excessive Agency         | AI invokes tools without consent   | [`require-tool-confirmation`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-tool-confirmation.md)                                                                                                                                     |
| LLM07 | System Prompt Leakage    | AI reveals system instructions     | [`no-system-prompt-leak`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-system-prompt-leak.md)                                                                                                                                             |
| LLM08 | Vector/Embedding Flaws   | Malicious embeddings in RAG        | [`require-embedding-validation`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-embedding-validation.md)                                                                                                                               |
| LLM09 | Misinformation           | AI output displayed without checks | [`require-output-validation`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-output-validation.md)                                                                                                                                     |
| LLM10 | Unbounded Consumption    | Token/step exhaustion              | [`require-max-tokens`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-max-tokens.md), [`require-max-steps`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-max-steps.md) |

## Why This Matters

OWASP isn't just a checklist for security audits. It's becoming a **compliance requirement**.

If you're building AI features for enterprise customers, they will ask: "How do you address the OWASP LLM Top 10?"

Having an automated, auditable answer makes the difference between a closed deal and a 6-month security review.

## Before & After

**Before** (silent vulnerability):

```typescript
await generateText({
  prompt: userInput, // No validation, no warning
});
```

**After** (with the linter):

```bash
🔒 CWE-74 OWASP:LLM01 CVSS:9.0 | Unvalidated prompt input | CRITICAL
   Fix: Validate/sanitize user input before use
```

No more finding these in production.

## The Implementation

[eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) provides SDK-aware rules for the Vercel AI SDK. It's not pattern-matching on strings—it understands `generateText`, `streamText`, `tool()`, and other SDK functions.

```javascript
// eslint.config.js
import vercelAISecurity from 'eslint-plugin-vercel-ai-security';

export default [
  vercelAISecurity.configs.recommended, // Balanced security
  // vercelAISecurity.configs.strict,   // Maximum security
];
```

### CI Integration

Every PR now gets automatic OWASP validation:

```yaml
# .github/workflows/security.yml
- name: Lint AI Security
  run: npx eslint 'src/**/*.ts' --max-warnings 0
```

## The Punch Line

100% OWASP LLM coverage sounds impressive in a sales deck. But more importantly, it means your AI application is protected against the most common attack patterns.

The plugin is free. The compliance is automatic. The alternative is manual pen-testing at $500/hour.

Your call.

---

_Follow me for more on AI security and compliance:_
[LinkedIn](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)
