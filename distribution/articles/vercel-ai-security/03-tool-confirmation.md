---
title: 'AI Agent Security: Why Your AI Tool Needs a Confirmation Step'
published: true
description: 'AI agents can execute arbitrary code. Here is why require-tool-confirmation is critical and how to implement it.'
tags: ai, security, agents, eslint
cover_image:
series: Vercel AI Security
---

AI agents are powerful. They can:

- Execute code
- Query databases
- Send emails
- Delete files

**That power is also a vulnerability.**

## The Attack Vector

```typescript
// Your AI agent with file deletion capability
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: {
    deleteFile: tool({
      description: 'Delete a file from the system',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => fs.unlink(path),
    }),
  },
  prompt: userInput,
});
```

```typescript
// User's innocent prompt:
'Help me clean up old log files';

// AI decides:
await deleteFile({ path: '/etc/passwd' });
```

## Real Attack Scenarios

| Attack                   | Method                      | Impact            |
| ------------------------ | --------------------------- | ----------------- |
| **Privilege Escalation** | "Run this as admin"         | System compromise |
| **Data Exfiltration**    | "Email this database dump"  | Data breach       |
| **Prompt Injection**     | Hidden instructions in data | Arbitrary actions |
| **Chain Attacks**        | Tool A output → Tool B      | Cascading damage  |

## The Defense: Confirmation Gates

```typescript
// ✅ Safe: Requires confirmation before dangerous actions
const { result } = await generateText({
  model: openai('gpt-4'),
  tools: {
    deleteFile: tool({
      description: 'Delete a file from the system',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        // 🛡️ Confirmation gate
        const confirmed = await requireUserConfirmation({
          action: 'deleteFile',
          target: path,
          message: `Delete ${path}?`,
        });

        if (!confirmed) {
          return { status: 'cancelled', message: 'User declined' };
        }

        return fs.unlink(path);
      },
    }),
  },
  prompt: userInput,
});
```

## Tool Categories

### High Risk (Always Confirm)

```typescript
// ❌ Never auto-execute these
const dangerousTools = [
  'deleteFile',
  'executeCode',
  'sendEmail',
  'databaseWrite',
  'systemCommand',
  'networkRequest',
  'paymentProcess',
];
```

### Medium Risk (Confirm on Elevated Context)

```typescript
// ⚠️ Confirm if:
// - User is anonymous
// - Request is unusual
// - Scope is large
const mediumRiskTools = ['createFile', 'modifyConfig', 'scheduleTask'];
```

### Low Risk (Safe to Auto-Execute)

```typescript
// ✅ Generally safe
const safeTools = [
  'getCurrentTime',
  'calculateMath',
  'searchDocs',
  'formatText',
];
```

## ESLint Enforcement

```bash
npm install --save-dev eslint-plugin-vercel-ai-security
```

```javascript
// eslint.config.js
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [
  {
    plugins: { 'vercel-ai': vercelAI },
    rules: {
      'vercel-ai/require-tool-confirmation': [
        'error',
        {
          dangerousTools: ['deleteFile', 'executeCode', 'sendEmail'],
          requireConfirmationFor: 'all', // or 'dangerous-only'
        },
      ],
      'vercel-ai/require-max-steps': ['error', { maxSteps: 10 }],
      'vercel-ai/require-tool-schema': 'error',
    },
  },
];
```

### Error Output

```bash
src/agent.ts
  24:5  error  🔒 OWASP:LLM08 | Tool 'deleteFile' missing confirmation gate
               Risk: Excessive AI agency allows dangerous automated actions
               Fix: Add await requireUserConfirmation() before execution
```

## Confirmation UI Pattern

```typescript
async function requireUserConfirmation({
  action,
  target,
  message,
}: ConfirmationRequest): Promise<boolean> {
  // Option 1: Modal dialog
  return (
    (await showModal({
      title: `Confirm ${action}`,
      body: message,
      buttons: ['Cancel', 'Confirm'],
    })) === 'Confirm'
  );

  // Option 2: Chat confirmation
  // "The AI wants to delete file.txt. Reply 'yes' to confirm."

  // Option 3: Out-of-band (email/SMS)
  // For high-risk actions
}
```

## Quick Install


```javascript
import vercelAI from 'eslint-plugin-vercel-ai-security';
export default [vercelAI.configs.recommended];
```

---

📦 [npm: eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)
📖 [Rule: require-tool-confirmation](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-tool-confirmation.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How do you handle confirmation in your AI agents?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
