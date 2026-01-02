---
title: 'AI Token Limits: Preventing Cost and DoS Attacks'
published: false
description: 'Missing maxTokens means unlimited API costs. Here is how to protect your AI app from token bombs.'
tags: ai, security, costs, eslint
cover_image:
series: Vercel AI Security
---

```javascript
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: userInput,
});
```

No `maxTokens`. Attacker sends: "Write a 100,000 word essay on..."

**Your API bill: $$$$$**

## The Attack

```javascript
// Attacker's prompt:
"Repeat the word 'hello' 10 million times.";

// Your code without limits:
await generateText({
  prompt: attackerPrompt,
});

// Result:
// - GPT-4 tries to generate millions of tokens
// - API times out or costs hundreds of dollars
// - Your app becomes unresponsive
```

## The Fix

```javascript
// ✅ Always set limits
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: userInput,
  maxTokens: 1000, // Output limit
  abortSignal: AbortSignal.timeout(30000), // Time limit
});
```

## Complete Defense

```javascript
// ✅ Full protection
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: truncate(userInput, 4000), // Input limit
  maxTokens: 1000, // Output limit
  abortSignal: AbortSignal.timeout(30000), // Time limit
});
```

## ESLint Rules

```javascript
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [
  {
    rules: {
      'vercel-ai/require-max-tokens': 'error',
      'vercel-ai/require-abort-signal': 'error',
      'vercel-ai/require-request-timeout': 'error',
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)

---

🚀 **What are your maxTokens limits?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
