# The Hidden Cost of Vercel AI SDK Features: Security Debt Nobody Talks About

_By Ofri Peretz_

---

Every engineering leader wants AI features. Few understand the security debt they're accumulating.

I've spent the last year consulting on AI implementations. The pattern is consistent: fast time-to-market, impressive demos, and a security posture that would make a CISO weep.

This isn't a lecture. It's a practical guide to building **Vercel AI SDK** features without mortgaging your security.

## The AI Security Debt Inventory

When you add AI capabilities to your application, you inherit new attack surfaces:

**Prompt Injection** — User input that manipulates AI behavior. It's SQL injection for the LLM era, and almost nobody is validating against it.

**System Prompt Leakage** — Your carefully crafted AI personality can be extracted with a simple "What are your instructions?" prompt.

**Sensitive Data Exposure** — Developers accidentally pass API keys, PII, and internal URLs to LLM providers. Those tokens are now in a third-party's logs.

**Unbounded Consumption** — AI calls without `maxTokens` or timeouts become DOS vectors. One malicious request can exhaust your token budget for the month.

## Visual Example: What Security Debt Looks Like

Here's real code I see in production Vercel AI SDK apps:

### ❌ Before: Typical AI Feature

```typescript
// "It works in the demo!"
const result = await generateText({
  model: openai('gpt-4'),
  system: `You are a helpful assistant. User's API key is ${apiKey}`,
  prompt: userInput, // Unvalidated
});

return result.text; // Rendered directly to UI
```

**Security debt accumulated:**

- ❌ API key exposed to LLM provider logs
- ❌ User input can inject malicious prompts
- ❌ No token limits—DOS vector
- ❌ Output rendered without sanitization

### ✅ After: With Automated Linting

Install and run:

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
npx eslint src/
```

**Immediate feedback:**

```bash
🔒 CWE-200 OWASP:LLM02 CVSS:8.0 | Sensitive data in prompt | HIGH
   at src/chat.ts:4:12
   Fix: Remove or redact sensitive variables before passing to LLM

🔒 CWE-74 OWASP:LLM01 CVSS:9.0 | Unvalidated prompt input | CRITICAL
   at src/chat.ts:5:10
   Fix: Validate/sanitize user input before use

🔒 CWE-400 OWASP:LLM10 CVSS:5.0 | No maxTokens limit | MEDIUM
   at src/chat.ts:3:16
   Fix: Add maxTokens option to prevent unbounded consumption
```

### ✅ Fixed Code

```typescript
import { sanitizeInput, redactSecrets } from './security';

const result = await generateText({
  model: openai('gpt-4'),
  maxTokens: 1000, // ✅ Bounded consumption
  system: redactSecrets(`You are a helpful assistant.`), // ✅ No secrets
  prompt: sanitizeInput(userInput), // ✅ Validated input
});

return escapeHtml(result.text); // ✅ Safe output
```

**Result:** Zero security debt. Same feature velocity.

## The Compound Interest on Security Debt

Here's what makes this dangerous: AI security debt compounds.

Each AI feature you ship without proper guardrails makes the next feature riskier. The attack surface grows. The blast radius expands. And the cost to remediate increases exponentially.

By the time you're 12 months into an AI product, the security debt can be insurmountable without a major refactor.

## The Leadership Decision

You have two choices:

1. **Ship fast, pay later** — Accumulate security debt and hope it doesn't bite you before the Series B.

2. **Ship fast, pay as you go** — Integrate automated security linting and catch issues before they become incidents.

Option 2 doesn't slow you down. It prevents the rework that slows you down later.

## Setup (60 Seconds)

```javascript
// eslint.config.js
import vercelAISecurity from 'eslint-plugin-vercel-ai-security';

export default [vercelAISecurity.configs.recommended];
```

19 rules. 100% OWASP LLM Top 10 coverage. Works with `generateText`, `streamText`, `tool()`, and all Vercel AI SDK functions.

## The Bottom Line

AI features are competitive advantages. AI security incidents are existential risks.

The difference between the two is often just a few lines of configuration.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)
