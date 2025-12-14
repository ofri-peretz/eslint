# `require-audit-logging`

> Suggests audit logging for AI SDK operations.

## 📊 Rule Details

| Property           | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                       |
| **Severity**       | ⚪ LOW                                                                           |
| **OWASP Agentic**  | [ASI10: Logging & Monitoring](https://owasp.org)                                 |
| **CWE**            | [CWE-778: Insufficient Logging](https://cwe.mitre.org/data/definitions/778.html) |
| **CVSS**           | 4.0                                                                              |
| **Config Default** | `off` (recommended, strict)                                                      |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that aren't preceded by logging statements. Audit logging is important for security monitoring and debugging.

## ❌ Incorrect Code

```typescript
// No logging
async function handler() {
  const result = await generateText({
    prompt: userInput,
  });
  return result.text;
}

// Missing audit trail
export async function processRequest(req) {
  await streamText({
    prompt: req.body.message,
  });
}
```

## ✅ Correct Code

```typescript
// With logging
async function handler() {
  logger.info('AI generation started', { userId, promptHash });
  try {
    const result = await generateText({
      prompt: userInput,
    });
    logger.info('AI generation completed', { userId, tokens: result.usage });
    return result.text;
  } catch (error) {
    logger.error('AI generation failed', { userId, error });
    throw error;
  }
}

// Console log (acceptable)
export async function processRequest(req) {
  console.log('Processing AI request', { requestId });
  await streamText({
    prompt: req.body.message,
  });
}
```

## ⚙️ Options

| Option         | Type      | Default | Description             |
| -------------- | --------- | ------- | ----------------------- |
| `allowInTests` | `boolean` | `true`  | Skip rule in test files |

## 🛡️ Why This Matters

Insufficient logging makes it impossible to:

- **Detect abuse** - Identify malicious usage patterns
- **Debug issues** - Trace problems in production
- **Audit compliance** - Prove regulatory compliance
- **Monitor costs** - Track API usage

## 🔗 Related Rules

- [`require-error-handling`](./require-error-handling.md) - Handle errors
- [`require-tool-confirmation`](./require-tool-confirmation.md) - Log destructive operations

## 📚 References

- [OWASP ASI10: Logging & Monitoring](https://owasp.org)
- [CWE-778: Insufficient Logging](https://cwe.mitre.org/data/definitions/778.html)
