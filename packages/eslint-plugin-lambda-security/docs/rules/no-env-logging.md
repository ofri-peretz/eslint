---
title: no-env-logging
description: Detect logging of process.env which may expose secrets
tags: ['security', 'logging', 'cwe-532', 'lambda', 'aws']
category: security
severity: high
cwe: CWE-532
owasp: "A09:2021"
autofix: false
---

> **Keywords:** logging, process.env, secrets, CloudWatch, CWE-532, Lambda, serverless
> **CWE:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html)  
> **OWASP:** [A09:2021-Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)


<!-- @rule-summary -->
Detect logging of process.env which may expose secrets
<!-- @/rule-summary -->

Detects logging of `process.env` which may expose API keys, passwords, and tokens in CloudWatch logs. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-532](https://cwe.mitre.org/data/definitions/532.html) (Info in Logs) |
| **Severity**      | High (secret exposure)                                                    |
| **Auto-Fix**      | 💡 Suggests specific variable logging                                     |
| **Category**      | Security                                                                  |
| **Best For**      | Lambda functions with any logging                                         |

## Vulnerability and Risk

**Vulnerability:** Logging `process.env` or `JSON.stringify(process.env)` exposes all environment variables, including secrets like API keys, database passwords, and authentication tokens.

**Risk:** CloudWatch logs may be:

- Accessed by developers with broad permissions
- Exported to third-party logging services
- Included in error reports and support tickets
- Retained long-term, increasing exposure window

## Rule Details

This rule detects:

- `console.log(process.env)` - logging entire env object
- `JSON.stringify(process.env)` - serializing all env vars
- Template literals containing `process.env`

## Why This Matters

| Risk                   | Impact                            | Solution                       |
| ---------------------- | --------------------------------- | ------------------------------ |
| 🔑 **Secret Exposure** | API keys, passwords leaked        | Log specific non-secret values |
| 📊 **Log Aggregation** | Secrets sent to external services | Filter sensitive data          |
| 👥 **Access Control**  | Developers see production secrets | Use secrets manager instead    |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```javascript
{
  rules: {
    'lambda-security/no-env-logging': ['error', {
      allowInTests: true
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
export const handler = async (event) => {
  // Logging entire env object
  console.log('Environment:', process.env); // ❌ Exposes all secrets

  console.log('Config:', JSON.stringify(process.env)); // ❌ Same issue

  console.log(`Starting with env: ${process.env}`); // ❌ Template literal

  // Debugging that exposes secrets
  logger.debug({ env: process.env }); // ❌ Structured log with secrets
};
```

### ✅ Correct

```typescript
export const handler = async (event, context) => {
  // Log only specific, non-sensitive values
  console.log('Starting handler', {
    region: process.env.AWS_REGION, // ✅ Non-sensitive
    version: process.env.APP_VERSION, // ✅ Non-sensitive
    requestId: context.awsRequestId, // ✅ Non-sensitive
  });

  // Never log these:
  // process.env.DATABASE_PASSWORD
  // process.env.API_KEY
  // process.env.JWT_SECRET
  // process.env.ENCRYPTION_KEY
};

// Better: Use AWS Secrets Manager
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});

async function getSecret(secretName: string) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );
  return JSON.parse(response.SecretString!);
}

export const handler = async (event) => {
  const secrets = await getSecret('my-app/prod');
  // Secrets are never in env vars, can't be accidentally logged
};
```

## Common Sensitive Environment Variables

| Variable Pattern        | Contains                   | Risk Level |
| ----------------------- | -------------------------- | ---------- |
| `*_PASSWORD`            | Database passwords         | Critical   |
| `*_SECRET`              | Encryption/signing secrets | Critical   |
| `*_KEY`                 | API keys                   | Critical   |
| `*_TOKEN`               | Auth tokens                | Critical   |
| `DATABASE_URL`          | Connection strings         | Critical   |
| `JWT_SECRET`            | JWT signing key            | Critical   |
| `AWS_ACCESS_KEY_ID`     | AWS credentials            | Critical   |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials            | Critical   |

## Safe Logging Pattern

```typescript
// Create a safe subset for logging
const safeEnvForLogging = {
  NODE_ENV: process.env.NODE_ENV,
  AWS_REGION: process.env.AWS_REGION,
  LOG_LEVEL: process.env.LOG_LEVEL,
  APP_VERSION: process.env.APP_VERSION,
};

console.log('Environment config:', safeEnvForLogging); // ✅ Safe
```

## Security Impact

| Vulnerability          | CWE | OWASP    | CVSS       | Impact              |
| ---------------------- | --- | -------- | ---------- | ------------------- |
| Sensitive Data in Logs | 532 | A09:2021 | 7.5 High   | Credential exposure |
| Info Disclosure        | 200 | A01:2021 | 5.3 Medium | Configuration leak  |

## Related Rules

- [`no-exposed-error-details`](./no-exposed-error-details.md) - Don't expose error details
- [`no-hardcoded-credentials-sdk`](./no-hardcoded-credentials-sdk.md) - No hardcoded secrets

## Further Reading

- **[CWE-532: Sensitive Info in Logs](https://cwe.mitre.org/data/definitions/532.html)** - Official CWE entry
- **[AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)** - Secure secret storage
- **[Lambda Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)** - AWS documentation