# no-select-sensitive-fields

> **Keywords:** CWE-200, information exposure, password, Mongoose, security

Detects queries that may return sensitive fields like passwords, tokens, or API keys.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **CWE Reference** | CWE-200 (Information Exposure)   |
| **OWASP**         | A01:2021 - Broken Access Control |
| **Severity**      | Medium (CVSS: 5.3)               |
| **Category**      | Security                         |

## Rule Details

Queries without field selection may inadvertently return sensitive data.

### ❌ Incorrect

```typescript
// Returns all fields including password
const user = await User.findById(id);
res.json(user); // Password hash exposed!

// Explicit select of sensitive fields
const user = await User.findById(id).select('+password');
```

### ✅ Correct

```typescript
// Exclude sensitive fields
const user = await User.findById(id).select('-password -refreshToken');

// Select only needed fields
const user = await User.findById(id).select('name email avatar');

// Use schema select: false for sensitive fields
const userSchema = new Schema({
  password: { type: String, select: false },
  refreshToken: { type: String, select: false },
});
```

## Options

```json
{
  "rules": {
    "mongodb-security/no-select-sensitive-fields": [
      "warn",
      {
        "sensitiveFields": [
          "password",
          "refreshToken",
          "apiKey",
          "secret",
          "ssn"
        ]
      }
    ]
  }
}
```

## When Not To Use It

- In authentication flows where password comparison is needed
- When schema already has `select: false` on all sensitive fields

## References

- [Mongoose Field Selection](<https://mongoosejs.com/docs/api/query.html#Query.prototype.select()>)
- [CWE-200](https://cwe.mitre.org/data/definitions/200.html)
