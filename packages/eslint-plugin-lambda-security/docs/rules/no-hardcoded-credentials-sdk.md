# no-hardcoded-credentials-sdk

> **Keywords:** AWS credentials, hardcoded secrets, CWE-798, security, ESLint rule, Lambda, SDK, credential provider, auto-fix, LLM-optimized

Detects hardcoded AWS credentials in SDK client configurations. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

⚠️ This rule **_errors_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                  |
| ----------------- | -------------------------------------------------------- |
| **CWE Reference** | CWE-798 (Use of Hard-coded Credentials)                  |
| **Severity**      | 🔴 Critical                                              |
| **Auto-Fix**      | ✅ Yes (suggests credential provider)                    |
| **Category**      | Security                                                 |
| **Best For**      | AWS Lambda handlers, SDK configurations, serverless apps |

## Vulnerability and Risk

**Vulnerability:** Hardcoded AWS access keys in source code can be extracted from compiled artifacts, leaked in version control, or exposed through code sharing.

**Risk:** Attackers gaining access to AWS credentials can:

- Access and exfiltrate data from S3, DynamoDB, etc.
- Spin up resources for crypto mining
- Delete or encrypt data for ransom
- Pivot to other AWS services

## Rule Logic Flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569'
  }
}}%%
flowchart TD
    A[🔍 NewExpression Found] --> B{AWS SDK Client?}
    B -->|No| C[✅ Skip]
    B -->|Yes| D{Has credentials object?}
    D -->|No| C
    D -->|Yes| E{Check credential properties}
    E --> F{accessKeyId literal?}
    F -->|Yes| G{Matches AKIA/ASIA pattern?}
    G -->|Yes| H[🚨 Report Error]
    G -->|No| C
    F -->|No| I{secretAccessKey literal?}
    I -->|Yes| J{Length >= 20?}
    J -->|Yes| H
    J -->|No| C
    I -->|No| C
    H --> K[💡 Suggest Credential Provider]

    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px
    classDef processNode fill:#eff6ff,stroke:#2563eb,stroke-width:2px
    classDef skipNode fill:#f1f5f9,stroke:#64748b,stroke-width:2px

    class A startNode
    class H errorNode
    class D,E,F,G,I,J processNode
    class C skipNode
```

## Examples

### ❌ Incorrect

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Hardcoded credentials - CRITICAL VULNERABILITY
const client = new S3Client({
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
});

// DynamoDB with hardcoded keys
const dynamodb = new DynamoDBClient({
  credentials: {
    accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'someSecretKey123456789012345678901234',
  },
});
```

### ✅ Correct

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// Use credential provider chain - SAFE
const client = new S3Client({
  credentials: fromNodeProviderChain(),
});

// Lambda automatically uses execution role - SAFE
const client = new S3Client({});

// Environment variables (handled by Lambda) - SAFE
const client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

## Detection Patterns

| Pattern                      | Risk Level  | Description                        |
| ---------------------------- | ----------- | ---------------------------------- |
| `AKIA*` access key           | 🔴 Critical | IAM user access key (permanent)    |
| `ASIA*` access key           | 🔴 Critical | STS temporary access key           |
| Literal `secretAccessKey`    | 🔴 Critical | Any hardcoded secret (>=20 chars)  |
| Template literal credentials | 🟡 High     | Dynamic construction is suspicious |

## Options

| Option         | Type      | Default | Description                               |
| -------------- | --------- | ------- | ----------------------------------------- |
| `allowInTests` | `boolean` | `true`  | Allow hardcoded credentials in test files |

```json
{
  "rules": {
    "lambda-security/no-hardcoded-credentials-sdk": [
      "error",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## Best Practices

### 1. Use Lambda Execution Role

```javascript
// Lambda automatically assumes its execution role
// No credentials needed!
const client = new S3Client({});
```

### 2. Use Credential Provider Chain

```javascript
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const client = new S3Client({
  credentials: fromNodeProviderChain(),
});
```

### 3. Use AWS Secrets Manager for Third-Party Credentials

```javascript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

async function getCredentials() {
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'my-api-key' }),
  );
  return JSON.parse(response.SecretString);
}
```

## Related Rules

- [`no-secrets-in-env`](./no-secrets-in-env.md) - Detects secrets in environment variable definitions
- [`no-env-logging`](./no-env-logging.md) - Detects logging of environment variables

## Resources

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [AWS SDK Credential Providers](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
