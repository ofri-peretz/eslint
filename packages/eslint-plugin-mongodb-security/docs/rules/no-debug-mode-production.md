# no-debug-mode-production

> **Keywords:** CWE-489, debug, Mongoose, logging, production, security

Detects Mongoose debug mode that could expose sensitive query information in production.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                              |
| ----------------- | ------------------------------------ |
| **CWE Reference** | CWE-489 (Active Debug Code)          |
| **OWASP**         | A05:2021 - Security Misconfiguration |
| **Severity**      | Low (CVSS: 3.1)                      |
| **Category**      | Security                             |

## Rule Details

Mongoose debug mode logs all queries to console, including:

- Query parameters (potentially containing PII)
- Collection names
- Update operations
- Aggregation pipelines

### ❌ Incorrect

```typescript
// Debug mode unconditionally enabled
mongoose.set('debug', true);

// Debug callback in production
mongoose.set('debug', (collectionName, method, query) => {
  console.log(collectionName, method, query);
});
```

### ✅ Correct

```typescript
// Conditional on environment
mongoose.set('debug', process.env.NODE_ENV !== 'production');

// Development-only debug
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

// Use proper logging framework
mongoose.set('debug', (collectionName, method, query) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug({ collectionName, method, query });
  }
});
```

## Known False Positives

### Already Conditional

```typescript
// FP: Already wrapped in environment check
if (process.env.DEBUG) {
  mongoose.set('debug', true); // Safe but may flag
}
```

## When Not To Use It

- In development-only codebases
- When debug logging is properly secured

## References

- [Mongoose Debug](<https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.set()>)
- [CWE-489](https://cwe.mitre.org/data/definitions/489.html)
