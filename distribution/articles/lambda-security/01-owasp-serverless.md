---
title: 'AWS Lambda Security: OWASP Serverless Top 10 in ESLint'
published: false
description: 'Lambda functions have unique vulnerabilities. Here is the OWASP Serverless Top 10 mapped to ESLint rules.'
tags: aws, lambda, security, eslint
cover_image:
series: AWS Lambda Security
---

Lambda functions are stateless, ephemeral, and... uniquely vulnerable.

Traditional security tools miss serverless-specific issues. Here's how ESLint catches them.

## OWASP Serverless Top 10 Mapping

| #   | Vulnerability           | ESLint Rule                       |
| --- | ----------------------- | --------------------------------- |
| S1  | Injection               | `no-unvalidated-event-body`       |
| S2  | Broken Authentication   | `no-missing-authorization-check`  |
| S3  | Sensitive Data Exposure | `no-exposed-error-details`        |
| S4  | Denial of Service       | `no-unbounded-batch-processing`   |
| S5  | Broken Access Control   | `no-overly-permissive-iam-policy` |
| S6  | Misconfiguration        | `no-permissive-cors-response`     |
| S7  | Insufficient Logging    | `no-error-swallowing`             |
| S8  | Insecure Secrets        | `no-secrets-in-env`               |
| S9  | SSRF                    | `no-user-controlled-requests`     |
| S10 | Event Injection         | `no-unvalidated-event-body`       |

## Vulnerability #1: Unvalidated Event Body

```javascript
// ❌ Trusting Lambda event directly
export const handler = async (event) => {
  const userId = event.body.userId; // SQL injection risk
  await db.query(`SELECT * FROM users WHERE id = ${userId}`);
};
```

```javascript
// ✅ Validate event body
import { z } from 'zod';

const eventSchema = z.object({
  userId: z.string().uuid(),
});

export const handler = async (event) => {
  const { userId } = eventSchema.parse(JSON.parse(event.body));
  await db.query('SELECT * FROM users WHERE id = $1', [userId]);
};
```

## Vulnerability #2: Missing Authorization

```javascript
// ❌ No authorization check
export const handler = async (event) => {
  const { orderId } = JSON.parse(event.body);
  return await getOrder(orderId); // Anyone can view any order
};
```

```javascript
// ✅ Authorization check
export const handler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) throw new Error('Unauthorized');

  const { orderId } = JSON.parse(event.body);
  const order = await getOrder(orderId);

  if (order.userId !== userId) throw new Error('Forbidden');
  return order;
};
```

## Vulnerability #3: Exposed Error Details

```javascript
// ❌ Exposes internal details
export const handler = async (event) => {
  try {
    return await processRequest(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack, // 💀 Stack trace!
        query: lastQuery, // 💀 SQL query!
      }),
    };
  }
};
```

```javascript
// ✅ Generic error response
export const handler = async (event) => {
  try {
    return await processRequest(event);
  } catch (error) {
    console.error('Internal error:', error); // Log internally
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        requestId: event.requestContext?.requestId,
      }),
    };
  }
};
```

## Vulnerability #4: Swallowed Errors

```javascript
// ❌ Error swallowed - no visibility
export const handler = async (event) => {
  try {
    return await processPayment(event);
  } catch (error) {
    // 🔇 Silent failure
  }
};
```

```javascript
// ✅ Log and propagate errors
export const handler = async (event) => {
  try {
    return await processPayment(event);
  } catch (error) {
    console.error('Payment failed:', {
      error: error.message,
      event: sanitize(event),
    });
    throw error; // Let Lambda retry or report
  }
};
```

## Vulnerability #5: Secrets in Environment

```javascript
// ❌ Secrets visible in Lambda console
process.env.DATABASE_PASSWORD = 'super_secret'; // Logged!

// Worse: hardcoded
const client = new Client({
  password: 'hardcoded_password',
});
```

```javascript
// ✅ Use Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const getSecret = async (secretName: string) => {
  const client = new SecretsManager();
  const response = await client.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString!);
};
```

## ESLint Configuration

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [lambdaSecurity.configs.recommended];
```

### 13 Lambda Security Rules

| Rule                              | What it catches                  |
| --------------------------------- | -------------------------------- |
| `no-unvalidated-event-body`       | Missing input validation         |
| `no-missing-authorization-check`  | No auth in handlers              |
| `no-exposed-error-details`        | Stack traces, queries in errors  |
| `no-error-swallowing`             | Empty catch blocks               |
| `no-secrets-in-env`               | Secrets in process.env           |
| `no-hardcoded-credentials-sdk`    | AWS credentials in code          |
| `no-overly-permissive-iam-policy` | `*` in IAM actions               |
| `no-permissive-cors-response`     | `Access-Control-Allow-Origin: *` |
| `no-permissive-cors-middy`        | Middy CORS misconfiguration      |
| `no-user-controlled-requests`     | SSRF via user input              |
| `no-unbounded-batch-processing`   | Large batch DoS                  |
| `no-env-logging`                  | Environment logged               |
| `require-timeout-handling`        | No timeout fallback              |

## Error Output

```bash
src/handlers/payment.ts
  15:3  error  🔒 CWE-390 | Empty catch block swallows errors
               Risk: Payment failures invisible to monitoring
               Fix: Log error and optionally re-throw

  42:5  error  🔒 CWE-209 | Error stack trace exposed in response
               Risk: Internal implementation details leaked
               Fix: Return generic error message to client
```

## Quick Install


```javascript
import lambdaSecurity from 'eslint-plugin-lambda-security';
export default [lambdaSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-lambda-security](https://www.npmjs.com/package/eslint-plugin-lambda-security)
📖 [OWASP Serverless Top 10 Mapping](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-lambda-security#owasp-serverless)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How many of these issues are in your Lambda functions?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
