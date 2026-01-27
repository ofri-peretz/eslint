---
title: no-verbose-error-messages
description: Prevent exposing stack traces to users in API responses
category: quality
severity: medium
tags: ['quality', 'operability', 'production', 'error-handling', 'cwe-209']
autofix: false
cwe: CWE-209
owasp: A01:2021-Broken-Access-Control
---

> **Keywords:** stack trace, error message, information disclosure, CWE-209, production, API response
> **CWE:** [CWE-209](https://cwe.mitre.org/data/definitions/209.html)  
> **OWASP:** [A01:2021-Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

Prevents exposing stack traces and verbose error details to users through API responses. This rule is part of [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) and provides LLM-optimized error messages.

**⚠️ Quality/Security rule** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-209](https://cwe.mitre.org/data/definitions/209.html) (Info in Errors) |
| **Severity**      | Medium (information disclosure)                                             |
| **Auto-Fix**      | ❌ No auto-fix (requires safe error handling)                               |
| **Category**      | Quality / Operability                                                       |
| **Best For**      | Express/Fastify/Koa applications with API endpoints                         |

## Vulnerability and Risk

**Vulnerability:** Exposing stack traces in API responses reveals internal application structure, file paths, library versions, and code organization to potential attackers.

**Risk:** Verbose error messages help attackers:

- Map internal application structure
- Identify vulnerable dependencies
- Craft targeted exploits
- Understand deployment environment

## Rule Details

This rule detects:

- `res.send(error.stack)` - directly sending stack traces
- `res.json({ stack: error.stack })` - stack traces in JSON responses
- Response objects containing `stack` properties

## Why This Matters

| Risk                   | Impact                                  | Solution                        |
| ---------------------- | --------------------------------------- | ------------------------------- |
| 🔍 **Reconnaissance**  | Attackers learn internal details        | Return generic error messages   |
| 📂 **Path Disclosure** | File paths reveal deployment structure  | Log details server-side only    |
| 📚 **Version Leak**    | Library versions expose vulnerabilities | Use error codes, not raw errors |

## Configuration

This rule has no configuration options.

```javascript
{
  rules: {
    'operability/no-verbose-error-messages': 'error'
  }
}
```

## Examples

### ❌ Incorrect

```typescript
app.use((err, req, res, next) => {
  // Sending stack trace directly
  res.status(500).send(err.stack); // ❌ Stack trace exposed
});

app.get('/api/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    // Stack trace in JSON response
    res.status(500).json({
      message: error.message,
      stack: error.stack, // ❌ Stack trace in response
    });
  }
});

// Error object with stack property
app.use((err, req, res, next) => {
  res.json({
    error: true,
    stack: err.stack, // ❌ Exposed
    path: __dirname, // ❌ Also exposed
  });
});
```

### ✅ Correct

```typescript
app.use((err, req, res, next) => {
  // Log full error server-side
  console.error('Request failed:', {
    // ✅ Server-side logging
    error: err,
    stack: err.stack,
    requestId: req.id,
  });

  // Return generic message to client
  res.status(500).json({
    error: 'Internal server error', // ✅ Generic message
    requestId: req.id, // ✅ Correlation ID for support
  });
});

// Better: Custom error handler with error codes
class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

app.use((err, req, res, next) => {
  console.error(err); // ✅ Full error logged server-side

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code, // ✅ User-facing code
      message: err.message, // ✅ Safe message
    });
  } else {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});
```

## Error Handling Best Practices

### Use Error Codes

```typescript
const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: 'Invalid input' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  INTERNAL: { status: 500, message: 'Internal server error' },
};

function sendError(res, code, requestId) {
  const error = ERROR_CODES[code] || ERROR_CODES.INTERNAL;
  res.status(error.status).json({
    error: code,
    message: error.message,
    requestId,
  });
}
```

### Environment-Aware Handler

```typescript
app.use((err, req, res, next) => {
  console.error(err);

  const response = {
    error: 'Internal server error',
    requestId: req.id,
  };

  // Only include stack in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack; // ⚠️ Development only
  }

  res.status(500).json(response);
});
```

## Security Impact

| Vulnerability   | CWE | OWASP    | CVSS       | Impact              |
| --------------- | --- | -------- | ---------- | ------------------- |
| Info Disclosure | 209 | A01:2021 | 4.3 Medium | Reconnaissance aid  |
| Error Handling  | 755 | A01:2021 | 3.7 Low    | Information leakage |

## Related Rules

- [`no-debug-code-in-production`](./no-debug-code-in-production.md) - No debug code in production
- [`no-console-log`](./no-console-log.md) - Control console usage

## Known False Negatives

### Indirect Stack Access

**Why**: Indirect property access not tracked.

```typescript
// ❌ NOT DETECTED - indirect access
const key = 'stack';
res.json({ [key]: error[key] });
```

**Mitigation**: Use explicit error sanitization functions.

## Further Reading

- **[CWE-209: Error Message Information Disclosure](https://cwe.mitre.org/data/definitions/209.html)** - Official CWE entry
- **[OWASP Error Handling](https://owasp.org/www-community/Improper_Error_Handling)** - Best practices
- **[Express Error Handling](https://expressjs.com/en/guide/error-handling.html)** - Express documentation
