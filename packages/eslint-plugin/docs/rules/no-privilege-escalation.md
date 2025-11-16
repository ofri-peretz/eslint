# no-privilege-escalation

> **Keywords:** privilege escalation, CWE-269, security, ESLint rule, role assignment, permission bypass, access control, user input, role checks, LLM-optimized, code security

Detects potential privilege escalation vulnerabilities where user input is used to assign roles or permissions without proper validation. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | CWE-269 (Improper Privilege Management)                                         |
| **Severity**      | High (security vulnerability)                                                   |
| **Auto-Fix**      | ❌ No (requires manual role check implementation)                               |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | All applications with role-based access control, user management systems       |

## Rule Details

Privilege escalation occurs when user input is used to assign roles or permissions without proper authorization checks. This rule detects assignments and operations that modify user privileges using unvalidated user input.

### Why This Matters

| Issue                 | Impact                              | Solution                   |
| --------------------- | ----------------------------------- | -------------------------- |
| 🔒 **Security**       | Users can escalate their privileges | Add role validation checks |
| 🐛 **Unauthorized Access** | Bypass access controls              | Verify permissions before assignment |
| 🔐 **Data Breach**    | Access to sensitive data            | Enforce role-based access  |
| 📊 **Compliance**     | Violates security standards         | Validate all privilege changes |

## Detection Patterns

The rule detects:

- **Role assignments from user input**: `user.role = req.body.role`
- **Permission assignments**: `user.permission = req.query.permission`
- **Privilege operations with user input**: `grant(user, req.body.permission)`, `setRole(user, req.query.role)`
- **Common privilege properties**: `role`, `permission`, `privilege`, `access`, `level`
- **Common privilege operations**: `setRole`, `grant`, `revoke`, `elevate`, `promote`, `updateRole`

## Examples

### ❌ Incorrect

```typescript
// Role assignment from user input without validation
app.put('/api/users/:id', (req, res) => {
  user.role = req.body.role; // ❌ No role check
  // User can set themselves as admin
});

// Permission assignment from query params
app.post('/api/permissions', (req, res) => {
  user.permission = req.query.permission; // ❌ No validation
  // User can grant themselves permissions
});

// Privilege operation with user input
app.post('/api/grant', (req, res) => {
  grant(user, req.body.permission); // ❌ No authorization check
  // User can grant themselves privileges
});
```

### ✅ Correct

```typescript
// Role assignment with validation
app.put('/api/users/:id', (req, res) => {
  if (!hasRole(currentUser, 'admin')) { // ✅ Role check
    throw new Error('Unauthorized');
  }
  user.role = req.body.role; // ✅ Safe after validation
});

// Permission assignment with authorization
app.post('/api/permissions', (req, res) => {
  if (!isAuthorized(currentUser, 'grant_permissions')) { // ✅ Authorization check
    throw new Error('Unauthorized');
  }
  user.permission = req.query.permission; // ✅ Safe after check
});

// Privilege operation with role validation
app.post('/api/grant', (req, res) => {
  if (!checkRole(currentUser, requiredRole)) { // ✅ Role validation
    throw new Error('Unauthorized');
  }
  grant(user, req.body.permission); // ✅ Safe after validation
});
```

## Configuration

### Default Configuration

```json
{
  "@forge-js/llm-optimized/security/no-privilege-escalation": "warn"
}
```

### Options

| Option              | Type      | Default                          | Description                        |
| ------------------- | --------- | -------------------------------- | ----------------------------------- |
| `allowInTests`      | `boolean` | `false`                          | Allow privilege escalation in tests |
| `testFilePattern`   | `string`  | `'\\.(test\|spec)\\.(ts\|tsx\|js\|jsx)$'` | Test file pattern regex |
| `roleCheckPatterns` | `string[]`| `['hasRole', 'checkRole', ...]` | Role check patterns to recognize   |
| `userInputPatterns` | `string[]`| `[]`                             | Additional user input patterns     |
| `ignorePatterns`    | `string[]`| `[]`                             | Additional patterns to ignore      |

### Example Configuration

```json
{
  "@forge-js/llm-optimized/security/no-privilege-escalation": [
    "error",
    {
      "allowInTests": true,
      "roleCheckPatterns": ["hasRole", "checkRole", "myCustomCheck"],
      "userInputPatterns": ["customInput"],
      "ignorePatterns": ["user.role"]
    }
  ]
}
```

## Best Practices

1. **Always validate roles** before assigning privileges from user input
2. **Use role checks**: Implement `hasRole()`, `checkRole()`, or similar functions
3. **Principle of least privilege**: Only allow necessary privilege changes
4. **Audit logs**: Log all privilege changes for security auditing
5. **Separate concerns**: Keep role assignment logic separate from user input handling

## Related Rules

- [`no-missing-authentication`](./no-missing-authentication.md) - Detects missing authentication checks
- [`no-unvalidated-user-input`](./no-unvalidated-user-input.md) - Detects unvalidated user input

## Resources

- [CWE-269: Improper Privilege Management](https://cwe.mitre.org/data/definitions/269.html)
- [OWASP: Improper Access Control](https://owasp.org/www-community/vulnerabilities/Improper_Access_Control)
- [OWASP: Privilege Escalation](https://owasp.org/www-community/attacks/Privilege_escalation)

