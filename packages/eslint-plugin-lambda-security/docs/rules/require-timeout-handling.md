---
title: require-timeout-handling
description: Require timeout handling in Lambda handlers with external calls
tags: ['serverless', 'lambda', 'cwe-400', 'timeout', 'aws']
category: reliability
severity: medium
cwe: CWE-400
autofix: false
---

> **Keywords:** Lambda, timeout, context, getRemainingTimeInMillis, AbortController, CWE-400, AWS, serverless
> **CWE:** [CWE-400](https://cwe.mitre.org/data/definitions/400.html)


<!-- @rule-summary -->
Require timeout handling in Lambda handlers with external calls
<!-- @/rule-summary -->

Warns when Lambda handlers make external calls without checking remaining execution time. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**⚠️ Reliability rule** | **💡 Provides suggestions** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) (Resource Issues) |
| **Severity**      | Medium (reliability concern)                                                 |
| **Auto-Fix**      | 💡 Suggests timeout check patterns                                           |
| **Category**      | Reliability                                                                  |
| **Best For**      | Lambda functions making HTTP, DB, or SDK calls                               |

## Why This Matters

| Risk                | Impact                            | Solution                             |
| ------------------- | --------------------------------- | ------------------------------------ |
| ⏱️ **Cold Timeout** | Function times out mid-operation  | Check remaining time before calls    |
| 🔄 **No Cleanup**   | Resources not released on timeout | Use AbortController for cancellation |
| 💸 **Costs**        | Timeout = full duration billing   | Fail fast when time is low           |

## Rule Details

This rule detects Lambda handlers that:

1. Have a `context` parameter (Lambda context object)
2. Make external calls (fetch, axios, SDK operations, database queries)
3. Do NOT use `context.getRemainingTimeInMillis()` or `AbortController`

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```javascript
{
  rules: {
    'lambda-security/require-timeout-handling': ['warn', {
      allowInTests: true
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// No timeout check - function may timeout mid-request
export const handler = async (event, context) => {
  const data = await fetch('https://api.example.com/data'); // ❌ No timeout handling
  const result = await dynamoDB.send(new GetCommand(params)); // ❌ May not complete

  return { statusCode: 200, body: JSON.stringify(result) };
};
```

### ✅ Correct

```typescript
// Check remaining time before external calls
export const handler = async (event, context) => {
  const remainingTime = context.getRemainingTimeInMillis(); // ✅ Check time

  if (remainingTime < 5000) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Insufficient time remaining' }),
    };
  }

  const controller = new AbortController(); // ✅ Cancellation support
  const timeout = setTimeout(() => controller.abort(), remainingTime - 1000);

  try {
    const response = await fetch('https://api.example.com/data', {
      signal: controller.signal,
    });
    return { statusCode: 200, body: JSON.stringify(await response.json()) };
  } finally {
    clearTimeout(timeout);
  }
};
```

### ✅ Also Correct: Promise.race Pattern

```typescript
export const handler = async (event, context) => {
  const fetchPromise = fetch('https://api.example.com/data');

  // Race between fetch and timeout
  const result = await Promise.race([
    // ✅ Timeout pattern detected
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Timeout')),
        context.getRemainingTimeInMillis() - 1000,
      ),
    ),
  ]);

  return { statusCode: 200, body: JSON.stringify(result) };
};
```

## Timeout Handling Patterns

### Pattern 1: Time Check + Early Exit

```typescript
const MINIMUM_TIME_MS = 5000;

export const handler = async (event, context) => {
  if (context.getRemainingTimeInMillis() < MINIMUM_TIME_MS) {
    console.warn('Insufficient time for operation');
    return { statusCode: 503, body: 'Service Unavailable' };
  }

  // Proceed with operation
};
```

### Pattern 2: AbortController with Timeout

```typescript
export const handler = async (event, context) => {
  const controller = new AbortController();
  const safeTimeout = context.getRemainingTimeInMillis() - 2000;

  const timeoutId = setTimeout(() => {
    console.log('Aborting request due to Lambda timeout');
    controller.abort();
  }, safeTimeout);

  try {
    return await performOperation({ signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};
```

### Pattern 3: AWS SDK with AbortController (v3)

```typescript
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

export const handler = async (event, context) => {
  const controller = new AbortController();
  const client = new DynamoDBClient({});

  setTimeout(
    () => controller.abort(),
    context.getRemainingTimeInMillis() - 1000,
  );

  const result = await client.send(new GetItemCommand(params), {
    abortSignal: controller.signal, // ✅ SDK v3 supports AbortSignal
  });

  return result.Item;
};
```

## Related Rules

- [`no-unbounded-batch-processing`](./no-unbounded-batch-processing.md) - Limit batch sizes
- [`no-error-swallowing`](./no-error-swallowing.md) - Don't swallow timeout errors

## Known False Negatives

### Custom Context Variable Names

**Why**: Non-standard context names not tracked.

```typescript
// ❌ NOT DETECTED - unusual parameter name
export const handler = async (event, lambdaCtx) => {
  await fetch(url); // No warning if 'lambdaCtx' not recognized
};
```

**Mitigation**: Use standard parameter names (`context`, `ctx`).

## Further Reading

- **[Lambda Context Object](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html)** - AWS documentation
- **[CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)** - Official CWE entry
- **[AbortController in Node.js](https://nodejs.org/api/globals.html#class-abortcontroller)** - Node.js docs