# `no-dynamic-system-prompt`

> Prevents dynamic content in system prompts to avoid agent confusion attacks.

## 📊 Rule Details

| Property           | Value                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| **Type**           | problem                                                                           |
| **Severity**       | 🔴 HIGH                                                                           |
| **OWASP Agentic**  | [ASI01: Agent Confusion](https://owasp.org)                                       |
| **CWE**            | [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html) |
| **CVSS**           | 8.0                                                                               |
| **Config Default** | `error` (recommended, strict)                                                     |

## 🔍 What This Rule Detects

This rule identifies code patterns where system prompts contain dynamic or user-controlled content. Dynamic system prompts can lead to agent confusion attacks where the AI's core behavior can be manipulated.

## ❌ Incorrect Code

```typescript
// Template literal with expression
await generateText({
  system: `You are a ${role} assistant.`,
  prompt: userInput,
});

// String concatenation
await generateText({
  system: 'You are a ' + role + ' assistant.',
  prompt: userInput,
});

// Function call result
await streamText({
  system: getSystemPrompt(agentType),
  prompt: userInput,
});

// Async system prompt
await generateObject({
  system: await fetchSystemPrompt(),
  prompt: userInput,
});
```

## ✅ Correct Code

```typescript
// Static string literal
await generateText({
  system: 'You are a helpful assistant.',
  prompt: userInput,
});

// Static constant
const SYSTEM = 'You are a helpful coding assistant.';
await generateText({
  system: SYSTEM,
  prompt: userInput,
});

// Static template literal (no expressions)
await streamText({
  system: `You are a helpful assistant.
  You can help with coding tasks.`,
  prompt: userInput,
});
```

## ⚙️ Options

| Option                 | Type      | Default | Description                                 |
| ---------------------- | --------- | ------- | ------------------------------------------- |
| `allowStaticTemplates` | `boolean` | `true`  | Allow template literals without expressions |

## 🛡️ Why This Matters

Dynamic system prompts enable attackers to:

- **Modify AI core behavior** - Change fundamental instructions
- **Bypass safety measures** - Remove content restrictions
- **Inject persistent instructions** - Add malicious instructions that persist across conversations
- **Create agent confusion** - Make the AI act inconsistently

## 🔗 Related Rules

- [`no-system-prompt-leak`](./no-system-prompt-leak.md) - Prevent system prompt exposure
- [`require-validated-prompt`](./require-validated-prompt.md) - Validate user prompts

## 📚 References

- [OWASP ASI01: Agent Confusion](https://owasp.org)
- [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html)
