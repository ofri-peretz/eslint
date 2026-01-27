---
title: no-exposed-error-details
description: Detect Lambda handlers exposing internal error details in responses
category: security
severity: medium
tags: ['security', 'information-disclosure', 'cwe-209', 'lambda', 'aws']
autofix: false
cwe: CWE-209
owasp: A01:2021-Broken-Access-Control
---

> **Keywords:** error details, stack trace, information disclosure, CWE-209, Lambda, serverless
> **CWE:** [CWE-209](https://cwe.mitre.org/data/definitions/209.html)  
> **OWASP:** [A01:2021-Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

Detects Lambda handlers that expose internal error details (stack traces, config, paths) in API responses. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**⚠️ Security rule** | **💡 Provides suggestions** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-209](https://cwe.mitre.org/data/definitions/209.html) (Info Disclosure) |
| **Severity**      | Medium (information disclosure)                                              |
| **Auto-Fix**      | 💡 Suggests generic error responses                                          |
| **Category**      | Security                                                                     |
| **Best For**      | Lambda functions returning API Gateway responses                             |

## Vulnerability and Risk

**Vulnerability:** Exposing internal error details like stack traces, file paths, configuration, or environment information in API responses gives attackers valuable reconnaissance information.

**Risk:** Exposed error details reveal:

- Internal file paths and application structure
- Library versions and dependencies
- Database connection strings
- Internal service endpoints
- Configuration details

## Rule Details

This rule detects API responses that include:

- `error.stack` or `error.stackTrace`
- `__dirname`, `__filename`
- `error.config`, `error.env`
- `JSON.stringify(error)` (exposes all error properties)

## Why This Matters

| Risk                   | Impact                                | Solution                      |
| ---------------------- | ------------------------------------- | ----------------------------- |
| 🔍 **Reconnaissance**  | Attackers learn internal structure    | Return generic error messages |
| 📂 **Path Disclosure** | Internal paths reveal deployment info | Log details server-side only  |
| 🔑 **Config Exposure** | Secrets in error objects exposed      | Sanitize before returning     |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```javascript
{
  rules: {
    'lambda-security/no-exposed-error-details': ['warn', {
      allowInTests: true
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
export const handler = async (event) => {
  try {
    await processRequest(event);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,  // ❌ Exposes internal paths
        path: __dirname      // ❌ Exposes deployment structure
      })
    };
  }
};

// Also dangerous
catch (error) {
  return {
    statusCode: 500,
    body: JSON.stringify(error)  // ❌ Exposes all error properties
  };
}
```

### ✅ Correct

```typescript
export const handler = async (event, context) => {
  try {
    await processRequest(event);
    return { statusCode: 200, body: '{}' };
  } catch (error) {
    // Log details server-side (CloudWatch)
    console.error('Request failed', {
      // ✅ Server-side logging
      error,
      requestId: context.awsRequestId,
      event: JSON.stringify(event),
    });

    // Return generic message to client
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error', // ✅ Generic message
        requestId: context.awsRequestId, // ✅ Correlation ID for support
      }),
    };
  }
};
```

### ✅ Custom Error Classes

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string, // Safe for client
    message: string, // For logging only
  ) {
    super(message);
  }

  toResponse() {
    return {
      statusCode: this.statusCode,
      body: JSON.stringify({ error: this.userMessage }), // ✅ Safe
    };
  }
}

export const handler = async (event) => {
  try {
    await processRequest(event);
  } catch (error) {
    console.error(error); // Full details to CloudWatch

    if (error instanceof AppError) {
      return error.toResponse(); // ✅ Controlled exposure
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
```

## Sensitive Error Properties

| Property  | Risk                            | Should Expose        |
| --------- | ------------------------------- | -------------------- |
| `message` | May contain sensitive details   | ⚠️ Sanitize          |
| `stack`   | Reveals paths, line numbers     | ❌ Never             |
| `cause`   | May chain sensitive errors      | ❌ Never             |
| `code`    | Internal error codes            | ⚠️ Map to user codes |
| `config`  | Request/response configurations | ❌ Never             |
| `path`    | File system paths               | ❌ Never             |

## Security Impact

| Vulnerability           | CWE | OWASP    | CVSS       | Impact              |
| ----------------------- | --- | -------- | ---------- | ------------------- |
| Info Disclosure         | 209 | A01:2021 | 4.3 Medium | Reconnaissance aid  |
| Improper Error Handling | 755 | A01:2021 | 3.7 Low    | Information leakage |

## Related Rules

- [`no-error-swallowing`](./no-error-swallowing.md) - Don't swallow errors
- [`no-env-logging`](./no-env-logging.md) - Don't log environment variables

## Further Reading

- **[CWE-209: Info Disclosure in Errors](https://cwe.mitre.org/data/definitions/209.html)** - Official CWE entry
- **[OWASP Error Handling](https://owasp.org/www-community/Improper_Error_Handling)** - Best practices
- **[AWS Lambda Error Handling](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-exceptions.html)** - AWS documentation
