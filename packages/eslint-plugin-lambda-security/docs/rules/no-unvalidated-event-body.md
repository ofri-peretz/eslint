---
title: no-unvalidated-event-body
description: Detect Lambda handlers using event body without validation
tags: ['security', 'input-validation', 'cwe-20', 'lambda', 'aws']
category: security
severity: high
cwe: CWE-20
owasp: "A03:2021"
autofix: false
---

> **Keywords:** input validation, event body, injection, CWE-20, Lambda, Zod, Joi, Middy, serverless
> **CWE:** [CWE-20](https://cwe.mitre.org/data/definitions/20.html)  
> **OWASP:** [A03:2021-Injection](https://owasp.org/Top10/A03_2021-Injection/)


<!-- @rule-summary -->
Detect Lambda handlers using event body without validation
<!-- @/rule-summary -->

Detects Lambda handlers that use event body, query parameters, or path parameters without validation. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) (Input Validation) |
| **CVSS Score**    | 8.0 High                                                                    |
| **Auto-Fix**      | 💡 Suggests schema validation                                               |
| **Category**      | Security                                                                    |
| **Best For**      | Lambda functions processing user input                                      |

## Vulnerability and Risk

**Vulnerability:** Using untrusted input from Lambda events without validation can lead to injection attacks, type confusion, and business logic bypasses.

**Risk:** Unvalidated input enables:

- NoSQL injection attacks
- SQL injection in downstream services
- Command injection via shell commands
- Business logic manipulation
- Type confusion vulnerabilities

## Rule Details

This rule detects direct usage of these event properties without passing through validation functions:

- `event.body`
- `event.queryStringParameters`
- `event.pathParameters`
- `event.headers`
- `event.multiValueQueryStringParameters`

## Why This Matters

| Risk                  | Impact                             | Solution                     |
| --------------------- | ---------------------------------- | ---------------------------- |
| 💉 **Injection**      | Database/command injection attacks | Validate with schema library |
| 📊 **Type Confusion** | Unexpected data types break logic  | Use typed validation         |
| 🔓 **Auth Bypass**    | Manipulated fields bypass checks   | Strict schema enforcement    |

## Configuration

| Option                 | Type       | Default | Description                          |
| ---------------------- | ---------- | ------- | ------------------------------------ |
| `allowInTests`         | `boolean`  | `true`  | Allow in test files                  |
| `additionalProperties` | `string[]` | `[]`    | Additional event properties to check |

```javascript
{
  rules: {
    'lambda-security/no-unvalidated-event-body': ['error', {
      allowInTests: true,
      additionalProperties: ['customProperty']
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
export const handler = async (event) => {
  const body = JSON.parse(event.body); // ❌ No validation
  const userId = body.userId; // Trusting user input

  const item = await db.get({ userId }); // Could be injection

  // Query params used directly
  const limit = event.queryStringParameters.limit; // ❌ Could be "1; DROP TABLE"

  return { statusCode: 200, body: JSON.stringify(item) };
};
```

### ✅ Correct with Zod

```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['read', 'write', 'delete']),
});

export const handler = async (event) => {
  const body = JSON.parse(event.body ?? '{}');

  // Validate with Zod
  const validatedData = RequestSchema.parse(body); // ✅ Validated

  const item = await db.get({ userId: validatedData.userId });
  return { statusCode: 200, body: JSON.stringify(item) };
};
```

### ✅ Correct with Middy Validator

```typescript
import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';

const inputSchema = transpileSchema({
  type: 'object',
  required: ['body'],
  properties: {
    body: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
      },
    },
  },
});

const baseHandler = async (event) => {
  // event.body is now validated ✅
  const { userId } = event.body;
  return { statusCode: 200, body: JSON.stringify({ userId }) };
};

export const handler = middy(baseHandler)
  .use(jsonBodyParser())
  .use(validator({ inputSchema })); // ✅ Middy validation
```

### ✅ Correct with Joi

```typescript
import Joi from 'joi';

const schema = Joi.object({
  userId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
});

export const handler = async (event) => {
  const body = JSON.parse(event.body ?? '{}');

  const { error, value } = schema.validate(body); // ✅ Validated
  if (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }

  await processUser(value);
  return { statusCode: 200 };
};
```

## Validation Libraries

| Library             | Type Safety  | Performance | Ecosystem         |
| ------------------- | ------------ | ----------- | ----------------- |
| **Zod**             | ✅ Excellent | Good        | TypeScript-first  |
| **Joi**             | ⚠️ Manual    | Good        | Node.js standard  |
| **Yup**             | ⚠️ Manual    | Good        | React forms       |
| **Middy**           | ⚠️ Manual    | Excellent   | Lambda middleware |
| **class-validator** | ✅ Good      | Moderate    | NestJS            |

## Security Impact

| Vulnerability           | CWE | OWASP    | CVSS     | Impact                  |
| ----------------------- | --- | -------- | -------- | ----------------------- |
| Input Validation        | 20  | A03:2021 | 8.0 High | Injection attacks       |
| Improper Neutralization | 74  | A03:2021 | 7.5 High | Command/query injection |

## Safe Patterns (Not Flagged)

```typescript
// Type checking
if (typeof event.body === 'string') { ... }

// Null checking
if (event.body) { ... }

// Optional chaining
const name = event.body?.name;

// Logging (not using the data)
console.log('Received event', event.body);
```

## Related Rules

- [`no-user-controlled-requests`](./no-user-controlled-requests.md) - SSRF prevention
- [`no-exposed-error-details`](./no-exposed-error-details.md) - Error handling

## Further Reading

- **[OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)** - Best practices
- **[CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)** - Official CWE entry
- **[Middy Validator](https://middy.js.org/docs/middlewares/validator)** - Lambda middleware
- **[Zod Documentation](https://zod.dev/)** - TypeScript validation