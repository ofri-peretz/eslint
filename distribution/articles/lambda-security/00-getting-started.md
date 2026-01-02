---
title: 'Getting Started with eslint-plugin-lambda-security'
published: true
description: 'AWS Lambda security in 60 seconds. 13 rules for OWASP Serverless Top 10 coverage.'
tags: aws, lambda, eslint, serverless
cover_image:
series: Getting Started
---

**13 Lambda security rules. OWASP Serverless Top 10. AWS best practices.**

## Who Is This For?

This plugin is for **Node.js teams** building serverless applications on AWS:

| Framework                                                                                                                     | Description                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [AWS Lambda](https://aws.amazon.com/lambda/)                                                                                  | Native function handlers                               |
| [Serverless Framework](https://www.serverless.com/framework/docs/)                                                            | Most popular serverless deployment tool                |
| [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) | AWS-native IaC for Lambda                              |
| [Middy.js](https://middy.js.org/)                                                                                             | Middleware engine for Lambda (we have specific rules!) |

If you deploy functions to Lambda — whether via CDK, SAM, Serverless Framework, or raw CloudFormation — this plugin catches security issues before they reach production.

## Quick Install

```bash
npm install --save-dev eslint-plugin-lambda-security
```

## Flat Config

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [lambdaSecurity.configs.recommended];
```

## Rule Overview

Based on the [OWASP Serverless Top 10](https://owasp.org/www-project-serverless-top-10/):

| Rule                              | OWASP   | What it catches        |
| --------------------------------- | ------- | ---------------------- |
| `no-unvalidated-event-body`       | S1, S10 | Injection via event    |
| `no-missing-authorization-check`  | S2      | No auth in handlers    |
| `no-exposed-error-details`        | S3      | Stack traces in errors |
| `no-unbounded-batch-processing`   | S4      | Large batch DoS        |
| `no-overly-permissive-iam-policy` | S5      | `*` in IAM             |
| `no-permissive-cors-response`     | S6      | CORS misconfiguration  |
| `no-error-swallowing`             | S7      | Empty catch blocks     |
| `no-secrets-in-env`               | S8      | Secrets in env vars    |
| `no-user-controlled-requests`     | S9      | SSRF                   |
| `no-env-logging`                  | S3      | Env logged             |
| `no-hardcoded-credentials-sdk`    | S8      | AWS creds in code      |
| `no-permissive-cors-middy`        | S6      | Middy CORS             |
| `require-timeout-handling`        | S4      | No timeout fallback    |

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/handlers/api.ts
  12:5  error  🔒 OWASP-S3 | Error details exposed to client
               Fix: Return generic error message, log details internally

src/handlers/batch.ts
  28:3  error  🔒 OWASP-S4 | Unbounded batch processing detected
               Fix: Add batch size limit: records.slice(0, 100)

src/config/cors.ts
  8:1   error  🔒 OWASP-S6 | Permissive CORS origin '*'
               Fix: Specify allowed origins: ['https://app.example.com']
```

## Quick Wins

### Error Handling

```javascript
// ❌ Dangerous: Exposes stack trace
export const handler = async (event) => {
  try {
    return await processEvent(event);
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.stack }) };
  }
};

// ✅ Safe: Generic error, internal logging
export const handler = async (event) => {
  try {
    return await processEvent(event);
  } catch (error) {
    console.error('Handler error:', error); // Logged to CloudWatch
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

### CORS Configuration

```javascript
// ❌ Dangerous: Wildcard origin
return {
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(data),
};

// ✅ Safe: Explicit origin
return {
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': 'https://app.example.com' },
  body: JSON.stringify(data),
};
```

## Custom Configuration

Add specific rules or customize options:

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  lambdaSecurity.configs.recommended,
  {
    rules: {
      // Override severity
      'lambda-security/no-error-swallowing': 'warn',

      // Configure with options
      'lambda-security/no-unbounded-batch-processing': [
        'error',
        {
          maxBatchSize: 50,
        },
      ],

      // Disable a rule
      'lambda-security/no-env-logging': 'off',
    },
  },
];
```

## Strongly-Typed Options (TypeScript)

The plugin exports types for IDE autocompletion:

```typescript
// eslint.config.ts
import lambdaSecurity, {
  type RuleOptions,
} from 'eslint-plugin-lambda-security';

const batchOptions: RuleOptions['no-unbounded-batch-processing'] = {
  maxBatchSize: 100,
  allowedSources: ['SQS', 'Kinesis'],
};

export default [
  lambdaSecurity.configs.recommended,
  {
    rules: {
      'lambda-security/no-unbounded-batch-processing': ['error', batchOptions],
    },
  },
];
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-lambda-security

# Config (eslint.config.js)
import lambdaSecurity from 'eslint-plugin-lambda-security';
export default [lambdaSecurity.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-lambda-security](https://www.npmjs.com/package/eslint-plugin-lambda-security)
📖 [OWASP Serverless Mapping](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-lambda-security#owasp-serverless)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building on Lambda? Run the linter!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
