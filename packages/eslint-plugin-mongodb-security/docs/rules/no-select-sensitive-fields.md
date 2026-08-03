---
title: no-select-sensitive-fields
description: Detects queries that may return sensitive fields like passwords, tokens, or API keys.
tags: ['security', 'mongodb']
category: security
severity: medium
cwe: CWE-200
owasp: "A01:2021"
autofix: false
---

> **Keywords:** CWE-200, information exposure, password, Mongoose, security


<!-- @rule-summary -->
Detects queries that may return sensitive fields like passwords, tokens, or API keys.
<!-- @/rule-summary -->

Detects queries that may return sensitive fields like passwords, tokens, or API keys.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **CWE Reference** | CWE-200 (Information Exposure)   |
| **OWASP**         | A01:2021 - Broken Access Control |
| **Severity**      | Medium (CVSS: 5.3)               |
| **Category**   | Security |

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

## Receiver Requirement

`find()`, `findOne()` and `findById()` are are not MongoDB-exclusive. This rule only fires when the receiver is
plausibly a Mongo model, collection or database handle — a PascalCase model
identifier (`User.find(...)`), a name ending in `Model`/`Collection`/`Schema`
(`this.userModel`, the idiomatic `@InjectModel()` injection), a bare
`db`/`model`/`collection`, a `db.collection('users')` chain, or a value bound
to a `mongodb`/`mongoose` import. PascalCase counts only for a module-level
identifier, not for a property reached through `this` — `this.UserRepository`
is an injected service, not a model.

It stays silent on:

- `Array.prototype.find` (array literals, predicate callbacks).
- Generic repository wrappers and other ORMs — a `Repository<T>.findOne()`
  says nothing about whether `T` has a password.

## Schema Visibility

Even on a real model, the rule needs to see evidence that a sensitive field
exists before claiming one is exposed. It reports when either:

1. the query itself names a sensitive field (`.select('password')`,
   `{ projection: { password: 1 } }`), or
2. a sensitive field name is visible in the file — a `new Schema({...})` key,
   an `@Prop()`/`@Column()` property, an interface member.

Set `requireVisibleSensitiveField: false` to go back to flagging every
unprojected read regardless of what the rule can see. That trades a large
amount of noise for recall on codebases whose schemas live entirely outside
the files that query them.

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
        ],
        "requireVisibleSensitiveField": true
      }
    ]
  }
}
```

## When Not To Use It

- In authentication flows where password comparison is needed
- When schema already has `select: false` on all sensitive fields

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Schema-Level `select: false`

**Why**: Schema definitions in other files are not visible.

```typescript
// ❌ NOT DETECTED - Schema has select: false (safe but not known)
// userSchema.ts: password: { type: String, select: false }
const user = await User.findById(id); // Password already excluded
```

**Mitigation**: This is a false positive risk. Use schema-level exclusion as primary defense.

### Variable Field Selection

**Why**: Select arguments from variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Fields from variable
const fields = '+password';
const user = await User.findById(id).select(fields);
```

**Mitigation**: Use inline select strings. Define field lists as constants.

### Aggregation Pipeline

**Why**: Aggregation $project stages are not checked.

```typescript
// ❌ NOT DETECTED - Sensitive field in aggregation
const users = await User.aggregate([
  { $match: { active: true } },
  { $project: { password: 1 } }, // Includes password!
]);
```

**Mitigation**: Review aggregation pipelines. Use $unset for sensitive fields.

### Lean Queries

**Why**: Lean queries bypass middleware that might filter fields.

```typescript
// ❌ NOT DETECTED - Lean returns raw document
const user = await User.findById(id).lean(); // Includes all fields
```

**Mitigation**: Always use .select() with .lean(). Define projection inline.

## References

- [Mongoose Field Selection](<https://mongoosejs.com/docs/api/query.html#Query.prototype.select()>)
- [CWE-200](https://cwe.mitre.org/data/definitions/200.html)