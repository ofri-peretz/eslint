# require-projection

> **Keywords:** CWE-200, projection, field selection, MongoDB, information exposure

Requires field projection on queries to minimize data exposure.

⚠️ This rule is **off** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **CWE Reference** | CWE-200 (Information Exposure)   |
| **OWASP**         | A01:2021 - Broken Access Control |
| **Severity**      | Low (CVSS: 3.7)                  |
| **Category**      | Security / Performance           |

## Rule Details

Queries without projection:

- Return more data than needed
- Increase network bandwidth
- May expose sensitive fields
- Reduce performance (more data to transfer)

### ❌ Incorrect

```typescript
// Returns all fields - may include sensitive data
const users = await User.find({ active: true });

// All fields returned, including large embedded documents
const post = await Post.findById(id);
```

### ✅ Correct

```typescript
// Explicit projection - only needed fields
const users = await User.find({ active: true }, 'name email avatar');

// Using .select()
const users = await User.find({ active: true }).select('name email');

// Exclusion projection
const user = await User.findById(id).select('-password -internalNotes');
```

## When Not To Use It

- For admin interfaces that need full document access
- When using lean() with full document transformation
- Development/debugging scenarios

## References

- [MongoDB Projections](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)
- [CWE-200](https://cwe.mitre.org/data/definitions/200.html)
