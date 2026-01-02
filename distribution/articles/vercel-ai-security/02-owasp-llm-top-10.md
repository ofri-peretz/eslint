---
title: 'OWASP LLM Top 10: Complete ESLint Coverage for AI Apps'
published: true
description: 'Map every OWASP LLM vulnerability to an ESLint rule. Automate AI security compliance with eslint-plugin-vercel-ai-security.'
tags: ai, security, owasp, eslint
cover_image:
series: Vercel AI Security
---

The OWASP LLM Top 10 defines the most critical vulnerabilities in AI applications.

**Here's how to catch all 10 with ESLint.**

## The OWASP LLM Top 10 (2025)

| #     | Vulnerability                | Risk Level |
| ----- | ---------------------------- | ---------- |
| LLM01 | Prompt Injection             | Critical   |
| LLM02 | Insecure Output Handling     | High       |
| LLM03 | Training Data Poisoning      | High       |
| LLM04 | Model Denial of Service      | Medium     |
| LLM05 | Supply Chain Vulnerabilities | Medium     |
| LLM06 | Sensitive Info Disclosure    | High       |
| LLM07 | Insecure Plugin Design       | High       |
| LLM08 | Excessive Agency             | Critical   |
| LLM09 | Overreliance                 | Medium     |
| LLM10 | Model Theft                  | Medium     |

## ESLint Rule Mapping

### LLM01: Prompt Injection

```javascript
// ESLint rules that catch this:
rules: {
  'vercel-ai/require-validated-prompt': 'error',
  'vercel-ai/no-dynamic-system-prompt': 'error',
}
```

{% details Example %}

```typescript
// ❌ Vulnerable
const { text } = await generateText({
  prompt: userInput,
});

// ✅ Safe
const { text } = await generateText({
  prompt: sanitizePrompt(userInput),
});
```

{% enddetails %}

### LLM02: Insecure Output Handling

```javascript
rules: {
  'vercel-ai/require-output-filtering': 'error',
  'vercel-ai/no-unsafe-output-handling': 'error',
  'vercel-ai/require-output-validation': 'error',
}
```

{% details Example %}

```typescript
// ❌ Vulnerable
return <div dangerouslySetInnerHTML={{ __html: aiResponse }} />;

// ✅ Safe
return <div>{sanitizeHtml(aiResponse)}</div>;
```

{% enddetails %}

### LLM03: Training Data Exposure

```javascript
rules: {
  'vercel-ai/no-training-data-exposure': 'error',
}
```

### LLM04: Model Denial of Service

```javascript
rules: {
  'vercel-ai/require-max-tokens': 'error',
  'vercel-ai/require-request-timeout': 'error',
  'vercel-ai/require-abort-signal': 'error',
}
```

{% details Example %}

```typescript
// ❌ Vulnerable: No limits
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: userInput,
});

// ✅ Safe: Resource limits
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: userInput,
  maxTokens: 1000,
  abortSignal: AbortSignal.timeout(30000),
});
```

{% enddetails %}

### LLM06: Sensitive Information Disclosure

```javascript
rules: {
  'vercel-ai/no-sensitive-in-prompt': 'error',
  'vercel-ai/no-system-prompt-leak': 'error',
  'vercel-ai/require-audit-logging': 'warn',
}
```

### LLM07: Insecure Plugin Design

```javascript
rules: {
  'vercel-ai/require-tool-schema': 'error',
  'vercel-ai/require-tool-confirmation': 'error',
}
```

{% details Example %}

```typescript
// ❌ Vulnerable: No schema validation
tools: {
  executeCommand: tool({
    execute: async (params) => runCommand(params.cmd),
  }),
}

// ✅ Safe: Schema + confirmation
tools: {
  executeCommand: tool({
    parameters: z.object({
      cmd: z.string().max(100),
    }),
    execute: async (params) => {
      await requireConfirmation(params.cmd);
      return runSandboxedCommand(params.cmd);
    },
  }),
}
```

{% enddetails %}

### LLM08: Excessive Agency

```javascript
rules: {
  'vercel-ai/require-max-steps': 'error',
  'vercel-ai/require-tool-confirmation': 'error',
}
```

{% details Example %}

```typescript
// ❌ Vulnerable: Unlimited agent actions
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: dangerousTools,
});

// ✅ Safe: Limited agency
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: safeTools,
  maxSteps: 5, // Limit iterations
});
```

{% enddetails %}

## Complete Configuration

```javascript
// eslint.config.js
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [
  // Full OWASP LLM Top 10 coverage
  vercelAI.configs['owasp-llm-top-10'],
];
```

## Compliance Report

Enable JSON output for audit logs:

```bash
npx eslint . --format json > ai-security-report.json
```

Parse for OWASP findings:

```javascript
const report = require('./ai-security-report.json');
const owaspFindings = report
  .flatMap((f) => f.messages)
  .filter((m) => m.message.includes('OWASP:LLM'));

console.log(`OWASP LLM findings: ${owaspFindings.length}`);
```

## Quick Install


```javascript
import vercelAI from 'eslint-plugin-vercel-ai-security';
export default [vercelAI.configs['owasp-llm-top-10']];
```

---

📦 [npm: eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
📖 [Full OWASP LLM Mapping](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-vercel-ai-security#owasp-llm-top-10)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How are you addressing OWASP LLM in your AI apps?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
