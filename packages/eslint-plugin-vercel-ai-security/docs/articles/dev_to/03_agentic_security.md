---
title: Securing AI Agents in the Vercel AI SDK
published: true
description: How to protect your Vercel AI SDK agents with automated ESLint rules covering OWASP Agentic Top 10 2026
tags: ai, security, vercel, typescript
cover_image:
---

2024 was the year of LLMs. 2025 is the year of **Agents**.

Agents don't just answer questions—they take actions. They browse the web, execute code, query databases, and call APIs. This changes the security model completely.

An LLM that hallucinates is annoying. **An Agent that hallucinates can delete your production database.**

> **This guide is for developers using the Vercel AI SDK.** The linting rules understand `generateText`, `streamText`, `tool()`, and other SDK functions natively.

## The OWASP Agentic Top 10 2026

OWASP saw this coming. They're drafting a new category specifically for agentic systems:

| #     | Category                      | The Risk                              |
| ----- | ----------------------------- | ------------------------------------- |
| ASI01 | Agent Confusion               | System prompt dynamically overwritten |
| ASI02 | Insufficient Input Validation | Tool parameters not validated         |
| ASI03 | Insecure Credentials          | API keys hardcoded in config          |
| ASI04 | Sensitive Data in Output      | Tools leak secrets in responses       |
| ASI05 | Unexpected Code Execution     | AI output executed as code            |
| ASI07 | RAG Injection                 | Malicious docs inject instructions    |
| ASI08 | Cascading Failures            | Errors propagate across agent steps   |
| ASI09 | Trust Boundary Violations     | AI bypasses authorization             |
| ASI10 | Insufficient Logging          | No audit trail for AI actions         |

## Visual Example: The Problem

The Vercel AI SDK makes building agents easy. Maybe too easy.

### ❌ Before: Unprotected Agent

```typescript
// This code ships to production every day
const result = await generateText({
  model: openai('gpt-4'),
  tools: {
    deleteUser: tool({
      execute: async ({ userId }) => {
        await db.users.delete(userId); // No confirmation, no validation
      },
    }),
  },
});
```

**What's wrong?**

- No human confirmation before destructive action
- No parameter validation on `userId`
- No `maxSteps` limit—agent can loop forever
- No error boundaries for cascading failures

### ✅ After: With ESLint Protection

Install and run the linter:

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
npx eslint src/
```

**Immediate feedback on every issue:**

```bash
🔒 CWE-862 OWASP:ASI09 CVSS:7.0 | Destructive tool without confirmation | HIGH
   at src/agent.ts:5:5
   Fix: Add human-in-the-loop confirmation before execution

🔒 CWE-20 OWASP:ASI02 CVSS:6.5 | Tool parameters not validated | MEDIUM
   at src/agent.ts:6:7
   Fix: Add Zod schema validation for tool parameters

🔒 CWE-400 OWASP:ASI08 CVSS:5.0 | No maxSteps limit on agent | MEDIUM
   at src/agent.ts:3:16
   Fix: Add maxSteps option to prevent infinite loops
```

### ✅ Fixed Code

```typescript
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4'),
  maxSteps: 10, // ✅ Prevent infinite loops
  tools: {
    deleteUser: tool({
      parameters: z.object({
        userId: z.string().uuid(), // ✅ Validated input
      }),
      execute: async ({ userId }, { confirmDangerous }) => {
        await confirmDangerous(); // ✅ Human-in-the-loop
        await db.users.delete(userId);
      },
    }),
  },
});
```

**Result:** All warnings resolved. Agent is production-ready.

## Setup (60 Seconds)

```javascript
// eslint.config.js
import vercelAISecurity from 'eslint-plugin-vercel-ai-security';

export default [
  vercelAISecurity.configs.strict, // Maximum security for agents
];
```

**Strict mode enforces:**

- ✅ Tool schema validation (Zod)
- ✅ Human confirmation for destructive actions
- ✅ `maxSteps` limits for multi-step workflows
- ✅ Error handling for cascading failures

## Coverage: 9/10 OWASP Agentic Categories

[eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) covers **9/10 OWASP Agentic categories**. ASI06 (Memory Corruption) is N/A for TypeScript.

The plugin knows:

- Which functions are Vercel AI SDK calls
- Which tools perform destructive operations
- Whether proper safeguards are in place

## The Bottom Line

AI agents are the most powerful—and most dangerous—software we've ever built.

The difference between a helpful assistant and a liability is the guardrails you put in place.

**Don't ship agents without them.**

---

_Follow me for more on AI security:_
[LinkedIn](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)
