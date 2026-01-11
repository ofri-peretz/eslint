# no-env-logging

> **Keywords:** environment variables, logging, Lambda, CWE-532, security, sensitive data exposure

Detects logging of environment variables which may contain secrets. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security).

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                             |
| ----------------- | --------------------------------------------------- |
| **CWE Reference** | CWE-532 (Insertion of Sensitive Info into Log File) |
| **Severity**      | 🟡 Warning                                          |
| **Auto-Fix**      | ❌ No (requires manual review)                      |
| **Category**      | Security                                            |
| **Best For**      | Lambda handlers, debugging code                     |

## Vulnerability and Risk

**Vulnerability:** Logging `process.env` or specific environment variables can expose secrets to CloudWatch Logs, which may be accessible to more users than intended.

**Risk:** Secrets in logs can be harvested by:

- Attackers with CloudWatch access
- Log aggregation tools
- Developers debugging in production

## Examples

### ❌ Incorrect

```javascript
// Logging all environment variables - VULNERABLE
console.log(process.env);
console.log('Environment:', JSON.stringify(process.env));

// Logging specific secrets - VULNERABLE
console.log('API Key:', process.env.API_KEY);
console.log(`Database password: ${process.env.DB_PASSWORD}`);

// Debug logging that leaks secrets
logger.debug({ env: process.env });
```

### ✅ Correct

```javascript
// Log only non-sensitive info - SAFE
console.log('Function started');
console.log('Region:', process.env.AWS_REGION);
console.log('Stage:', process.env.STAGE);

// Filter out sensitive keys - SAFE
const safeEnv = {
  AWS_REGION: process.env.AWS_REGION,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
};
console.log('Config:', JSON.stringify(safeEnv));

// Use structured logging without secrets
logger.info({
  message: 'Processing request',
  requestId: event.requestContext?.requestId,
});
```

## Options

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```json
{
  "rules": {
    "lambda-security/no-env-logging": "warn"
  }
}
```

## Best Practices

### 1. Define Safe Variables to Log

```javascript
const SAFE_ENV_VARS = ['AWS_REGION', 'NODE_ENV', 'STAGE', 'LOG_LEVEL'];

function getSafeEnv() {
  return Object.fromEntries(
    SAFE_ENV_VARS.map((key) => [key, process.env[key]]),
  );
}
```

### 2. Use Log Levels

```javascript
// Only log environment in development
if (process.env.NODE_ENV === 'development') {
  console.log('Config:', getSafeEnv());
}
```

## Related Rules

- [`no-secrets-in-env`](./no-secrets-in-env.md) - Secrets in environment definitions
- [`no-hardcoded-credentials-sdk`](./no-hardcoded-credentials-sdk.md) - Hardcoded credentials

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Indirect process.env Access

**Why**: Environment accessed through variables is not tracked.

```typescript
// ❌ NOT DETECTED - Indirect access
const env = process.env;
console.log(env); // Logs all env vars
```

**Mitigation**: Avoid storing process.env in variables.

### Custom Logger Methods

**Why**: Non-standard logger methods may not be recognized.

```typescript
// ❌ NOT DETECTED - Custom logger
customLogger.trace({ env: process.env });
```

**Mitigation**: Configure rule for custom logger method names.

### Spread into Log Object

**Why**: Spread operator hides the source.

```typescript
// ❌ NOT DETECTED - Spread env vars
console.log({ ...process.env, timestamp: Date.now() });
```

**Mitigation**: Never spread process.env into objects.

### Serialization Before Logging

**Why**: Pre-serialized data is not traced.

```typescript
// ❌ NOT DETECTED - Serialized before log
const data = JSON.stringify(process.env);
// Later...
console.log(data); // Logs all secrets!
```

**Mitigation**: Never serialize full process.env.

## Resources

- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
- [AWS Lambda Logging Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-532 OWASP:A09 CVSS:5.3 | Log Information Exposure detected | MEDIUM [GDPR,HIPAA,PCI-DSS,SOC2]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A09_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-532](https://cwe.mitre.org/data/definitions/532.html) [OWASP:A09](https://owasp.org/Top10/A09_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Log Information Exposure detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM [GDPR,HIPAA,PCI-DSS,SOC2]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A09_2021-Injection/) |
