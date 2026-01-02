# no-unsafe-where

> **Keywords:** NoSQL injection, CWE-943, MongoDB, $where, RCE, CVE-2025-23061, CVE-2024-53900, Mongoose

Prevents use of the dangerous `$where` operator which executes JavaScript on the MongoDB server, enabling Remote Code Execution (RCE).

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                   |
| ----------------- | ----------------------------------------- |
| **CWE Reference** | CWE-943 (NoSQL Injection)                 |
| **CVE**           | CVE-2025-23061, CVE-2024-53900            |
| **OWASP**         | A01:2021 - Broken Access Control          |
| **Severity**      | Critical (CVSS: 9.0)                      |
| **Category**      | Security                                  |
| **ESLint MCP**    | ✅ Optimized for AI assistant integration |

## Rule Details

The `$where` operator evaluates JavaScript on the MongoDB server. This is:

1. **Extremely dangerous** - Can lead to RCE if user input reaches `$where`
2. **Performance-killer** - JavaScript evaluation is slow and not indexed
3. **Deprecated** - MongoDB discourages its use

### CVE Coverage

- **CVE-2025-23061**: Mongoose 8.x series - user input in `$where` allowing arbitrary code execution
- **CVE-2024-53900**: Mongoose 7.x series - similar vulnerability in population paths

### ❌ Incorrect

```typescript
// Direct $where with user input - RCE vulnerability
User.find({ $where: `this.name === '${req.body.name}'` });

// $where with function - still dangerous
User.find({
  $where: function () {
    return this.age > userAge;
  },
});

// Even hardcoded $where is discouraged
User.find({ $where: 'this.x > this.y' });
```

### ✅ Correct

```typescript
// Use standard query operators instead
User.find({ name: { $eq: req.body.name } });

// Use $expr for complex comparisons
User.find({ $expr: { $gt: ['$age', 18] } });

// Use aggregation pipeline for computed fields
User.aggregate([
  { $addFields: { isActive: { $gt: ['$lastLogin', olderDate] } } },
  { $match: { isActive: true } },
]);
```

## Known False Negatives

### Dynamic Query Construction

```typescript
// ❌ NOT DETECTED
const query = {};
query['$where'] = userInput;
User.find(query);
```

### Indirect Reference

```typescript
// ❌ NOT DETECTED
const operator = '$where';
User.find({ [operator]: '...' });
```

## When Not To Use It

**Never disable this rule.** The `$where` operator should never be used in modern MongoDB applications:

- Use `$expr` for field comparisons
- Use aggregation pipelines for complex logic
- Use application-side filtering if necessary

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - General unsafe query detection
- [no-operator-injection](./no-operator-injection.md) - Operator injection prevention

## References

- [CVE-2025-23061 - Mongoose $where Injection](https://nvd.nist.gov/vuln/detail/CVE-2025-23061)
- [CVE-2024-53900 - Mongoose Population Path Injection](https://nvd.nist.gov/vuln/detail/CVE-2024-53900)
- [MongoDB $where Operator](https://www.mongodb.com/docs/manual/reference/operator/query/where/)
- [CWE-943](https://cwe.mitre.org/data/definitions/943.html)
