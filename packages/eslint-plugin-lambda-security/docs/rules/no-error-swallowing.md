---
title: no-error-swallowing
description: Detect empty catch blocks and missing error logging
tags: ['serverless', 'lambda', 'cwe-390', 'logging', 'aws']
category: security
severity: medium
cwe: CWE-390
owasp: "A09:2021"
autofix: false
---

> **Keywords:** catch block, error handling, logging, CWE-390, Lambda, serverless, monitoring
> **CWE:** [CWE-390](https://cwe.mitre.org/data/definitions/390.html)  
> **OWASP:** [A09:2021-Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)


<!-- @rule-summary -->
Detect empty catch blocks and missing error logging
<!-- @/rule-summary -->

Detects empty catch blocks and catch handlers that don't log errors in Lambda handlers. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**⚠️ Security rule** | **💡 Provides suggestions** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-390](https://cwe.mitre.org/data/definitions/390.html) (Error Without Action) |
| **Severity**      | Medium (security/observability)                                                   |
| **Auto-Fix**      | 💡 Suggests adding console.error                                                  |
| **Category**      | Security                                                                          |
| **Best For**      | Lambda functions with try/catch error handling                                    |

## Vulnerability and Risk

**Vulnerability:** Swallowing errors without logging hides security incidents, making it impossible to detect attacks, diagnose issues, or understand application behavior.

**Risk:** Without error logging:

- Security incidents go undetected
- Debugging becomes impossible
- SLA breaches are hidden
- Audit trails are incomplete

## Rule Details

This rule detects:

1. Empty catch blocks
2. Catch blocks without logging statements
3. Catch blocks that return without logging

## Why This Matters

| Risk                  | Impact                                | Solution                          |
| --------------------- | ------------------------------------- | --------------------------------- |
| 🕵️ **Hidden Attacks** | Security breaches go unnoticed        | Log all errors with context       |
| 🔍 **Debugging**      | Can't diagnose production issues      | Include error details in logs     |
| 📊 **Monitoring**     | Alarms can't trigger on hidden errors | Integrate with CloudWatch/Datadog |

## Configuration

| Option             | Type      | Default | Description                           |
| ------------------ | --------- | ------- | ------------------------------------- |
| `allowInTests`     | `boolean` | `true`  | Allow in test files                   |
| `allowWithComment` | `boolean` | `true`  | Allow if comment explains intentional |

```javascript
{
  rules: {
    'lambda-security/no-error-swallowing': ['warn', {
      allowInTests: true,
      allowWithComment: true
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
export const handler = async (event) => {
  try {
    await processEvent(event);
  } catch (error) {
    // Empty catch - error is completely hidden
  } // ❌ Error swallowed

  try {
    await anotherOperation();
  } catch (error) {
    return { statusCode: 200 }; // ❌ Returns success without logging
  }
};
```

### ✅ Correct

```typescript
export const handler = async (event, context) => {
  try {
    await processEvent(event);
  } catch (error) {
    console.error('Process failed', {
      // ✅ Logged with context
      error,
      requestId: context.awsRequestId,
      event: JSON.stringify(event),
    });

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};

// Or with structured logger
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger();

export const handler = async (event) => {
  try {
    await processEvent(event);
  } catch (error) {
    logger.error('Operation failed', { error }); // ✅ Structured logging
    throw error; // ✅ Re-thrown for Lambda retry
  }
};
```

### ✅ Intentional Suppression (with comment)

```typescript
try {
  await optionalCleanup();
} catch (error) {
  // intentional: cleanup errors are non-critical  ✅ Comment explains
}
```

## Error Logging Best Practices

### Include Context

```typescript
catch (error) {
  console.error('Payment processing failed', {
    error: error.message,
    stack: error.stack,
    userId: event.userId,
    transactionId: event.transactionId,
    awsRequestId: context.awsRequestId,
    remainingTime: context.getRemainingTimeInMillis()
  });
}
```

### Structured Logging

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'payment-service' });

catch (error) {
  logger.error('Payment failed', {
    error,
    transactionId: event.transactionId
  });
}
```

### CloudWatch Metrics

```typescript
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics({ namespace: 'PaymentService' });

catch (error) {
  metrics.addMetric('PaymentErrors', MetricUnits.Count, 1);
  metrics.addMetadata('errorType', error.name);
  console.error(error);
}
```

## Security Impact

| Vulnerability        | CWE | OWASP    | CVSS       | Impact                    |
| -------------------- | --- | -------- | ---------- | ------------------------- |
| Error Without Action | 390 | A09:2021 | 5.0 Medium | Hidden security incidents |
| Insufficient Logging | 778 | A09:2021 | 4.3 Medium | Missing audit trail       |

## Related Rules

- [`no-exposed-error-details`](./no-exposed-error-details.md) - Don't expose error details to users
- [`require-timeout-handling`](./require-timeout-handling.md) - Handle timeout errors

## Known False Positives

### Custom Loggers

If you use a custom logger not recognized by the rule:

```javascript
// Add to recognized patterns
catch (error) {
  myCustomLogger.error(error);  // May need rule configuration
}
```

## Further Reading

- **[Lambda Logging](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html)** - AWS documentation
- **[CWE-390: Error Condition Without Action](https://cwe.mitre.org/data/definitions/390.html)** - Official CWE entry
- **[AWS Lambda Powertools](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/)** - Structured logging