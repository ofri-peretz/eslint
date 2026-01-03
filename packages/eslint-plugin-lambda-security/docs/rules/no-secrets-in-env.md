# no-secrets-in-env

> **Keywords:** secrets, environment variables, Lambda, CWE-798, security, hardcoded secrets

Detects secrets defined directly in environment variable configurations. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security).

⚠️ This rule **_errors_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                               |
| ----------------- | ----------------------------------------------------- |
| **CWE Reference** | CWE-798 (Use of Hard-coded Credentials)               |
| **Severity**      | 🔴 Critical                                           |
| **Auto-Fix**      | ✅ Yes (suggests Secrets Manager)                     |
| **Category**      | Security                                              |
| **Best For**      | Lambda configurations, CDK/SAM/Serverless definitions |

## Vulnerability and Risk

**Vulnerability:** Secrets hardcoded in Lambda environment variable configurations are exposed in:

- CloudFormation templates
- AWS Console (visible to anyone with Lambda access)
- Deployment logs
- Version control

**Risk:** Credential exposure leads to unauthorized access to databases, APIs, and other services.

## Examples

### ❌ Incorrect

```javascript
// CDK - Hardcoded secrets in environment - VULNERABLE
new lambda.Function(this, 'Handler', {
  environment: {
    DATABASE_PASSWORD: 'super_secret_password',
    API_KEY: 'sk-1234567890abcdef',
  },
});

// SAM/CloudFormation template
// Environment:
//   Variables:
//     SECRET_KEY: "hardcoded-secret-value"
```

### ✅ Correct

```javascript
// CDK - Use Secrets Manager - SAFE
const secret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'DbSecret',
  'prod/db/password',
);

new lambda.Function(this, 'Handler', {
  environment: {
    SECRET_ARN: secret.secretArn,
  },
});

// Reference secret in Lambda code
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

async function getSecret() {
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }),
  );
  return response.SecretString;
}
```

## Options

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```json
{
  "rules": {
    "lambda-security/no-secrets-in-env": "error"
  }
}
```

## Best Practices

### Use AWS Secrets Manager

```javascript
// Store secrets in Secrets Manager, reference by ARN
environment: {
  DB_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db';
}
```

### Use AWS Systems Manager Parameter Store

```javascript
// For less sensitive configuration
environment: {
  CONFIG_PARAM: '/prod/app/config';
}
```

## Related Rules

- [`no-hardcoded-credentials-sdk`](./no-hardcoded-credentials-sdk.md) - AWS SDK credentials
- [`no-env-logging`](./no-env-logging.md) - Logging environment variables

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Secrets from Variables

**Why**: Values stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Secret from variable
const dbPassword = 'super_secret_password';
new lambda.Function(this, 'Handler', {
  environment: { DATABASE_PASSWORD: dbPassword },
});
```

**Mitigation**: Use Secrets Manager references. Never store secrets in variables.

### Secrets from External Files

**Why**: Values imported from config files are not visible.

```typescript
// ❌ NOT DETECTED - Secret from config
import { secrets } from './secrets.json';
environment: {
  API_KEY: secrets.apiKey;
}
```

**Mitigation**: Apply rule to config files. Use Secrets Manager.

### Construct Props Spreading

**Why**: Spread operator hides actual values.

```typescript
// ❌ NOT DETECTED - Environment from spread
const envVars = getEnvironmentConfig();
new lambda.Function(this, 'Handler', {
  environment: { ...envVars }, // May contain secrets
});
```

**Mitigation**: Explicitly define environment variables.

### SSM Parameter Values

**Why**: Parameter values resolved at deploy time are not checked.

```typescript
// ❌ NOT DETECTED - SSM value at deploy time
const param = ssm.StringParameter.valueForStringParameter(this, '/prod/secret');
environment: {
  SECRET: param;
} // Value is secret at deploy
```

**Mitigation**: Use dynamic SSM resolution at runtime instead.

## Resources

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
