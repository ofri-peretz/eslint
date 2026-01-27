---
title: no-exposed-debug-endpoints
description: Detect debug endpoints without authentication in Lambda handlers
category: security
severity: high
tags: ['security', 'debug', 'cwe-489', 'lambda', 'aws']
autofix: false
cwe: CWE-489
owasp: A05:2021-Security-Misconfiguration
---

> **Keywords:** debug endpoint, admin endpoint, authentication, CWE-489, Lambda, serverless
> **CWE:** [CWE-489](https://cwe.mitre.org/data/definitions/489.html)  
> **OWASP:** [A05:2021-Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

Detects debug and admin endpoints in Lambda handlers that may be exposed without authentication. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-489](https://cwe.mitre.org/data/definitions/489.html) (Active Debug) |
| **Severity**      | High (security vulnerability)                                             |
| **Auto-Fix**      | ❌ No auto-fix (requires auth implementation)                             |
| **Category**      | Security                                                                  |
| **Best For**      | Lambda functions with HTTP triggers                                       |

## Vulnerability and Risk

**Vulnerability:** Debug endpoints like `/debug`, `/admin`, `/__debug__`, `/health` may expose sensitive internal information or administrative functionality if left accessible in production without authentication.

**Risk:** Exposed debug endpoints can:

- Reveal application internals and configuration
- Provide admin functionality to attackers
- Expose health check details useful for reconnaissance
- Allow state manipulation in development modes

## Rule Details

This rule detects:

- Path literals like `/debug`, `/admin`, `/_admin`, `/__debug__`, `/test`
- Route comparisons: `event.path === '/debug'`
- Serverless Framework path configurations

## Why This Matters

| Risk                    | Impact                                  | Solution                    |
| ----------------------- | --------------------------------------- | --------------------------- |
| 🔓 **Admin Access**     | Attackers gain administrative functions | Add authentication          |
| 🔍 **Information Leak** | Internal state/config exposed           | Remove from production      |
| 🛠️ **Debug Tools**      | Development tools in production         | Environment-based disabling |

## Configuration

| Option        | Type       | Default                                   | Description              |
| ------------- | ---------- | ----------------------------------------- | ------------------------ |
| `endpoints`   | `string[]` | `['/debug', '/__debug__', '/admin', ...]` | Debug paths to flag      |
| `ignoreFiles` | `string[]` | `[]`                                      | Files/patterns to ignore |

```javascript
{
  rules: {
    'lambda-security/no-exposed-debug-endpoints': ['error', {
      endpoints: ['/debug', '/__debug__', '/admin', '/_admin', '/test', '/health'],
      ignoreFiles: ['health-check.ts']  // Allow specific health check handlers
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// Direct debug endpoint check
export const handler = async (event) => {
  if (event.path === '/debug') {
    // ❌ Debug endpoint without auth
    return {
      statusCode: 200,
      body: JSON.stringify({
        env: process.env,
        memory: process.memoryUsage(),
      }),
    };
  }
};

// Serverless Framework config
export const serverless = {
  functions: {
    admin: {
      handler: 'handler.admin',
      events: [
        {
          http: {
            path: '/admin', // ❌ Admin endpoint
            method: 'get',
          },
        },
      ],
    },
  },
};
```

### ✅ Correct

```typescript
import { verifyJwt } from './auth';

export const handler = async (event) => {
  // Authenticate all admin requests
  if (event.path === '/admin') {
    const authResult = await verifyJwt(event.headers.authorization); // ✅ Auth check
    if (!authResult.valid) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    return handleAdminRequest(event);
  }
};

// Environment-based debug endpoints
export const handler = async (event) => {
  if (event.path === '/debug') {
    if (process.env.NODE_ENV === 'production') {
      // ✅ Disabled in prod
      return { statusCode: 404, body: 'Not Found' };
    }

    return getDebugInfo();
  }
};

// Health check with limited information
export const healthHandler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      version: process.env.APP_VERSION, // ✅ Only safe info
      // NOT: env, memory, internal state
    }),
  };
};
```

## Default Flagged Endpoints

| Endpoint     | Risk Level | Common Purpose                  |
| ------------ | ---------- | ------------------------------- |
| `/debug`     | High       | Debug information               |
| `/__debug__` | High       | Internal debug                  |
| `/admin`     | Critical   | Administrative functions        |
| `/_admin`    | Critical   | Hidden admin                    |
| `/test`      | Medium     | Test endpoints                  |
| `/health`    | Low        | Health checks (may reveal info) |

## Security Impact

| Vulnerability     | CWE | OWASP    | CVSS         | Impact                 |
| ----------------- | --- | -------- | ------------ | ---------------------- |
| Active Debug Code | 489 | A05:2021 | 7.5 High     | Information disclosure |
| Missing Auth      | 306 | A07:2021 | 9.8 Critical | Unauthorized access    |

## Ignore Patterns for Legitimate Use

```javascript
// Disable for specific health check handler
/* eslint-disable lambda-security/no-exposed-debug-endpoints */

// Or use rule configuration
{
  rules: {
    'lambda-security/no-exposed-debug-endpoints': ['error', {
      ignoreFiles: ['health.ts', 'readiness.ts']
    }]
  }
}
```

## Related Rules

- [`no-exposed-error-details`](./no-exposed-error-details.md) - Don't expose error details
- [`no-env-logging`](./no-env-logging.md) - Don't log environment variables

## Further Reading

- **[CWE-489: Active Debug Code](https://cwe.mitre.org/data/definitions/489.html)** - Official CWE entry
- **[OWASP Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)** - OWASP guidance
- **[API Gateway Authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html)** - AWS docs
