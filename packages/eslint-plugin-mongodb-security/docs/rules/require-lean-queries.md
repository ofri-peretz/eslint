# require-lean-queries

> **Keywords:** CWE-400, lean, performance, Mongoose, memory

Suggests using `.lean()` for read-only Mongoose queries to reduce memory usage.

⚠️ This rule is **off** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                       |
| ----------------- | ----------------------------- |
| **CWE Reference** | CWE-400 (Resource Exhaustion) |
| **OWASP**         | A04:2021 - Insecure Design    |
| **Severity**      | Low (CVSS: 4.3)               |
| **Category**      | Performance                   |

## Rule Details

Mongoose documents are fully-featured objects with:

- Change tracking
- Virtuals
- Getters/setters
- Instance methods

For read-only operations, this overhead is unnecessary and wastes memory.

### ❌ Incorrect

```typescript
// Full Mongoose documents - 2-5x memory overhead
const users = await User.find({ active: true });
res.json(users); // Just doing JSON conversion anyway
```

### ✅ Correct

```typescript
// Plain JavaScript objects - minimal memory
const users = await User.find({ active: true }).lean();

// With virtuals if needed
const users = await User.find().lean({ virtuals: true });

// For documents that need modification, skip lean()
const user = await User.findById(id); // Full document
user.lastLogin = new Date();
await user.save();
```

## When Not To Use It

- When documents need to be modified and saved
- When virtuals or instance methods are required
- For small result sets where overhead is negligible

## References

- [Mongoose Lean Queries](https://mongoosejs.com/docs/tutorials/lean.html)
- [CWE-400](https://cwe.mitre.org/data/definitions/400.html)
