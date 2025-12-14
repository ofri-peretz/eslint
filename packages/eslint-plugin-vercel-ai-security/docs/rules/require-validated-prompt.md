# `require-validated-prompt`

> Prevents prompt injection by detecting unvalidated user input in AI prompts.

## 📊 Rule Details

| Property           | Value                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Type**           | problem                                                                                                |
| **Severity**       | 🔴 CRITICAL                                                                                            |
| **OWASP LLM**      | [LLM01: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html)                      |
| **CVSS**           | 9.0                                                                                                    |
| **Config Default** | `error` (recommended, strict)                                                                          |

## 🔍 What This Rule Detects

This rule identifies code patterns where user-controlled input is passed directly to AI prompts without validation or sanitization. Such patterns expose your application to prompt injection attacks.

## ❌ Incorrect Code

```typescript
// Direct user input in prompt
await generateText({
  prompt: userInput,
});

// User input from request
await generateText({
  prompt: req.body.question,
});

// Concatenated user input
await generateText({
  prompt: 'Answer this: ' + userQuestion,
});

// Template literal with user input
await streamText({
  prompt: `User asked: ${message}`,
});
```

## ✅ Correct Code

```typescript
// Validated input
await generateText({
  prompt: validateInput(userInput),
});

// Sanitized prompt
await generateText({
  prompt: sanitizePrompt(req.body.question),
});

// Safe static prompt
await generateText({
  prompt: 'What is the capital of France?',
});

// Validated template
await streamText({
  prompt: `User asked: ${validateQuestion(message)}`,
});
```

## ⚙️ Options

| Option               | Type       | Default                                                                                         | Description                                  |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `validatorFunctions` | `string[]` | `['validate', 'sanitize', 'escape', 'filter', 'clean', 'verify', 'check']`                      | Function names considered as safe validators |
| `userInputPatterns`  | `string[]` | `['userInput', 'input', 'query', 'question', 'message', 'prompt', 'request', 'body', 'params']` | Variable patterns suggesting user input      |
| `allowInTests`       | `boolean`  | `true`                                                                                          | Skip validation in test files                |

### Example Configuration

```javascript
{
  rules: {
    'vercel-ai-security/require-validated-prompt': ['error', {
      validatorFunctions: ['validateInput', 'sanitizePrompt', 'cleanUserInput'],
      userInputPatterns: ['userQuery', 'chatMessage'],
      allowInTests: true
    }]
  }
}
```

## 🛡️ Why This Matters

Prompt injection is the #1 security risk for LLM applications according to OWASP. Attackers can:

- Override system instructions
- Extract sensitive information
- Manipulate AI behavior
- Bypass content filters

## 🔗 Related Rules

- [`no-sensitive-in-prompt`](./no-sensitive-in-prompt.md) - Prevent sensitive data in prompts
- [`no-dynamic-system-prompt`](./no-dynamic-system-prompt.md) - Prevent dynamic system prompts

## 📚 References

- [OWASP LLM01: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html)
- [Vercel AI SDK Security](https://sdk.vercel.ai/docs)
