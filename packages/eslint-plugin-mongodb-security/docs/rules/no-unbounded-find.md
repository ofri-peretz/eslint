# no-unbounded-find

> **Keywords:** CWE-400, resource exhaustion, limit, MongoDB, DoS, security

Requires `limit()` on find queries to prevent resource exhaustion from unbounded result sets.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                       |
| ----------------- | ----------------------------- |
| **CWE Reference** | CWE-400 (Resource Exhaustion) |
| **OWASP**         | A04:2021 - Insecure Design    |
| **Severity**      | Low (CVSS: 4.3)               |
| **Category**      | Security / Performance        |

## Rule Details

Unbounded queries can:

- Exhaust server memory
- Cause denial of service
- Impact database performance
- Expose excessive data

### ❌ Incorrect

```typescript
// No limit - could return millions of documents
const users = await User.find({ active: true });

// Cursor without limit
const cursor = db.collection('logs').find({});
```

### ✅ Correct

```typescript
// Explicit limit
const users = await User.find({ active: true }).limit(100);

// Pagination
const users = await User.find()
  .skip((page - 1) * pageSize)
  .limit(pageSize);

// findOne is inherently limited
const user = await User.findOne({ email });
```

## Known False Negatives

### Limit in Options Object

```typescript
// ❌ NOT DETECTED
User.find({}, null, { limit: 100 });
```

### Dynamic Limit

```typescript
// ❌ NOT DETECTED
User.find().limit(config.maxResults);
```

## When Not To Use It

- For batch processing jobs that intentionally process all documents
- When using streaming cursors for pagination
- Admin dashboards with controlled access

## References

- [MongoDB cursor.limit()](https://www.mongodb.com/docs/manual/reference/method/cursor.limit/)
- [CWE-400](https://cwe.mitre.org/data/definitions/400.html)
