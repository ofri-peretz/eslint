# no-missing-authentication

> **Keywords:** missing authentication, CWE-287, security, ESLint rule, authentication middleware, route handlers, Express, Fastify, API security, access control, LLM-optimized, code security

Detects missing authentication checks in route handlers. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | CWE-287 (Improper Authentication)                                               |
| **Severity**      | Critical (security vulnerability)                                               |
| **Auto-Fix**      | ❌ No (requires manual authentication setup)                                    |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | All web applications with API endpoints, Express, Fastify, Next.js             |

## Rule Details

Missing authentication checks allow unauthorized access to protected resources. This rule detects route handlers that don't have authentication middleware configured.

### Why This Matters

| Issue                 | Impact                              | Solution                   |
| --------------------- | ----------------------------------- | -------------------------- |
| 🔒 **Security**       | Unauthorized access to APIs         | Add authentication middleware |
| 🐛 **Data Breach**    | Sensitive data exposure              | Protect all endpoints      |
| 🔐 **Compliance**     | Violates security standards         | Enforce authentication     |
| 📊 **Best Practice**  | All protected routes need auth      | Use auth middleware        |

## Detection Patterns

The rule detects:

- **Express routes**: `app.get()`, `app.post()`, `app.put()`, `app.delete()`, `app.patch()`, `app.all()`
- **Route handlers without authentication middleware** in arguments
- **Common auth middleware patterns**: `authenticate`, `auth`, `requireAuth`, `isAuthenticated`, `verifyToken`, `checkAuth`, `ensureAuthenticated`, `passport.authenticate`, `jwt`, `session`

## Examples

### ❌ Incorrect

```typescript
// Missing authentication on protected route
app.get('/api/users', (req, res) => { // ❌ No auth middleware
  // Return user data
});

app.post('/api/users', (req, res) => { // ❌ No auth middleware
  // Create user
});

router.put('/api/users/:id', (req, res) => { // ❌ No auth middleware
  // Update user
});
```

### ✅ Correct

```typescript
// Authentication middleware added
app.get('/api/users', authenticate(), (req, res) => { // ✅ Auth middleware
  // Return user data
});

app.post('/api/users', auth, requireAuth, (req, res) => { // ✅ Multiple auth checks
  // Create user
});

router.put('/api/users/:id', verifyToken(), (req, res) => { // ✅ Token verification
  // Update user
});

// Public route (can be ignored via options)
app.get('/api/public', (req, res) => { // ✅ Public endpoint
  // Return public data
});
```

## Configuration

### Default Configuration

```json
{
  "@forge-js/llm-optimized/security/no-missing-authentication": "warn"
}
```

### Options

| Option                  | Type      | Default                          | Description                        |
| ----------------------- | --------- | -------------------------------- | ----------------------------------- |
| `allowInTests`         | `boolean` | `false`                          | Allow missing auth in tests         |
| `testFilePattern`       | `string`  | `'\\.(test\|spec)\\.(ts\|tsx\|js\|jsx)$'` | Test file pattern regex |
| `authMiddlewarePatterns`| `string[]`| `['authenticate', 'auth', ...]`  | Auth middleware patterns to recognize |
| `routeHandlerPatterns` | `string[]`| `['get', 'post', ...]`       | Route handler patterns to check       |
| `ignorePatterns`       | `string[]`| `[]`                             | Additional patterns to ignore       |

### Example Configuration

```json
{
  "@forge-js/llm-optimized/security/no-missing-authentication": [
    "error",
    {
      "allowInTests": true,
      "authMiddlewarePatterns": ["authenticate", "myCustomAuth"],
      "routeHandlerPatterns": ["get", "post", "put", "delete"],
      "ignorePatterns": ["/api/public"]
    }
  ]
}
```

## Best Practices

1. **Always add authentication** to protected routes
2. **Use middleware**: Leverage Express/Fastify middleware for consistent auth
3. **Public routes**: Explicitly mark public routes or use ignore patterns
4. **Token validation**: Verify JWT/session tokens on all protected endpoints
5. **Role-based access**: Combine with role checks for fine-grained control

## Related Rules

- [`no-privilege-escalation`](./no-privilege-escalation.md) - Detects privilege escalation vulnerabilities
- [`no-unvalidated-user-input`](./no-unvalidated-user-input.md) - Detects unvalidated user input

## Resources

- [CWE-287: Improper Authentication](https://cwe.mitre.org/data/definitions/287.html)
- [OWASP: Improper Authentication](https://owasp.org/www-community/vulnerabilities/Improper_Authentication)
- [Express Authentication Guide](https://expressjs.com/en/guide/using-middleware.html)

