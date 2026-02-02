---
title: require-error-handling
description: "This rule identifies AI SDK calls that aren't wrapped in try-catch blocks"
tags: ['security', 'ai']
category: security
severity: medium
cwe: CWE-755
autofix: false
---

> Ensures AI SDK calls are wrapped in try-catch to prevent cascading failures.


<!-- @rule-summary -->
This rule identifies AI SDK calls that aren't wrapped in try-catch blocks
<!-- @/rule-summary -->

## 📊 Rule Details

| Property           | Value                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                              |
| **Severity**       | 🟠 MEDIUM                                                                                               |
| **OWASP Agentic**  | [ASI08: Cascading Failures](https://owasp.org)                                                          |
| **CWE**            | [CWE-755: Improper Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/755.html) |
| **CVSS**           | 5.0                                                                                                     |
| **Config Default** | `off` (recommended), `error` (strict)                                                                   |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that aren't wrapped in try-catch blocks. AI calls can fail due to rate limits, network issues, or content filtering.

## ❌ Incorrect Code

```typescript
// No error handling
async function handler() {
  const result = await generateText({
    prompt: 'Hello',
  });
  return result.text;
}

// Missing catch
async function process() {
  const stream = await streamText({
    prompt: 'Stream this',
  });
  return stream;
}
```

## ✅ Correct Code

```typescript
// With try-catch
async function handler() {
  try {
    const result = await generateText({
      prompt: 'Hello',
    });
    return result.text;
  } catch (error) {
    logger.error('AI call failed', error);
    throw new AppError('AI service unavailable');
  }
}

// Error handling with fallback
async function process() {
  try {
    const stream = await streamText({
      prompt: 'Stream this',
    });
    return stream;
  } catch (error) {
    return getFallbackResponse();
  }
}
```

## ⚙️ Options

| Option         | Type      | Default | Description             |
| -------------- | --------- | ------- | ----------------------- |
| `allowInTests` | `boolean` | `true`  | Skip rule in test files |

## 🛡️ Why This Matters

Unhandled AI errors can cause:

- **Cascading failures** - One failure crashes entire system
- **Information leakage** - Stack trace exposes internals
- **Poor user experience** - Generic error pages
- **Silent failures** - Problems go unnoticed

## 🔗 Related Rules

- [`require-audit-logging`](./require-audit-logging.md) - Log AI operations
- [`require-abort-signal`](./require-abort-signal.md) - Enable cancellation

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Try-Catch in Caller

**Why**: Error handling in calling function is not tracked.

```typescript
// ❌ NOT DETECTED - Try-catch in caller
async function handler() {
  return aiService.generate('Hello'); // aiService has try-catch
}
```

**Mitigation**: Add error handling at AI call site for clarity.

### Global Error Handlers

**Why**: Express/framework error middleware is not visible.

```typescript
// ❌ NOT DETECTED (correctly) - Express error handler
app.use(errorHandler); // Catches all errors
async function handler() {
  return await generateText({ prompt: 'Hello' });
}
```

**Mitigation**: Use local error handling for graceful degradation.

### Wrapper with Built-in Error Handling

**Why**: Custom wrappers with internal error handling are not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper has error handling
const result = await safeGenerateText({ prompt: 'Hello' });
```

**Mitigation**: Apply rule to wrapper implementations.

### Promise.catch()

**Why**: Promise chain error handling may not be recognized.

```typescript
// ⚠️ MAY NOT DETECT - Promise catch
generateText({ prompt: 'Hello' })
  .then((r) => r.text)
  .catch(handleError);
```

**Mitigation**: Use async/await with try-catch for clarity.

## 📚 References

- [OWASP ASI08: Cascading Failures](https://owasp.org)
- [CWE-755: Improper Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/755.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-755 OWASP:A10 CVSS:7.5 | Improper Handling of Exceptional Conditions detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A10_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-755](https://cwe.mitre.org/data/definitions/755.html) [OWASP:A10](https://owasp.org/Top10/A10_2021-Injection/) CVSS Score |
| **Issue Description** | Specific vulnerability | `Improper Handling of Exceptional Conditions detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A10_2021-Injection/) |