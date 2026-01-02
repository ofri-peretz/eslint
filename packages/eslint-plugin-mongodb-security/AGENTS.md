# AI Agent Resolution Strategies

This document provides resolution strategies for AI assistants (GitHub Copilot, Cursor, Claude) to automatically fix issues reported by `eslint-plugin-mongodb-security`.

---

## NoSQL Injection Rules

### `no-unsafe-query`

**Detection**: String concatenation or template literals in MongoDB query objects.

**Resolution Strategy**:

1. Replace string interpolation with explicit `$eq` operator
2. Wrap user input with sanitization function
3. Use schema-validated input

```typescript
// Before (vulnerable)
db.collection('users').find({ username: userInput });

// After (safe)
db.collection('users').find({ username: { $eq: sanitize(userInput) } });
```

---

### `no-operator-injection`

**Detection**: Direct use of request body/params in MongoDB query operators.

**Resolution Strategy**:

1. Add explicit `$eq` wrapper around all user inputs
2. Validate input type before use in query
3. Use allow-list for expected values

```typescript
// Before (vulnerable - allows { password: { $ne: null } })
User.findOne({ email: req.body.email, password: req.body.password });

// After (safe)
User.findOne({
  email: { $eq: String(req.body.email) },
  password: { $eq: String(req.body.password) },
});
```

---

### `no-unsafe-where`

**Detection**: Use of `$where` operator with any dynamic input.

**Resolution Strategy**:

1. Remove `$where` entirely and replace with standard operators
2. Never use `$where` with user input
3. Use aggregation pipeline instead if complex logic needed

```typescript
// Before (vulnerable - CVE-2025-23061)
db.collection('users').find({ $where: `this.age > ${age}` });

// After (safe)
db.collection('users').find({ age: { $gt: Number(age) } });
```

---

### `no-unsafe-regex-query`

**Detection**: `$regex` with unescaped user input.

**Resolution Strategy**:

1. Escape special regex characters
2. Anchor pattern with `^` and `$` where possible
3. Add timeout or complexity limits

```typescript
// Before (vulnerable)
User.find({ name: { $regex: searchTerm } });

// After (safe)
const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
User.find({ name: { $regex: `^${escaped}`, $options: 'i' } });
```

---

## Credential Rules

### `no-hardcoded-connection-string`

**Resolution Strategy**:

1. Replace with `process.env.MONGODB_URI`
2. Use secret management service

```typescript
// Before
mongoose.connect('mongodb://admin:password@localhost:27017/mydb');

// After
mongoose.connect(process.env.MONGODB_URI!);
```

---

### `require-tls-connection`

**Resolution Strategy**:

1. Add `{ tls: true }` to connection options
2. Use `mongodb+srv://` protocol (TLS by default)

```typescript
// Before
mongoose.connect(uri);

// After
mongoose.connect(uri, { tls: true, tlsCAFile: process.env.MONGO_CA_CERT });
```

---

## Mongoose ODM Rules

### `no-select-sensitive-fields`

**Resolution Strategy**:

1. Add `.select('-password -refreshToken')` to queries
2. Use schema-level `select: false` option

```typescript
// Before
const user = await User.findById(id);

// After
const user = await User.findById(id).select('-password -refreshToken -apiKey');
```

---

### `require-lean-queries`

**Resolution Strategy**:

1. Add `.lean()` for read-only operations
2. Keep full documents only when using middleware/virtuals

```typescript
// Before
const users = await User.find({ active: true });

// After
const users = await User.find({ active: true }).lean();
```

---

## Message Format

All rules use LLM-optimized messages:

```
🔒 CWE-943 OWASP:A03-Injection CVSS:9.0 | NoSQL injection via user input | CRITICAL
   Fix: Use { field: { $eq: sanitize(value) } } pattern
   https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection
```

---

## Related

- [OWASP NoSQL Injection Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)
- [CWE-943: NoSQL Injection](https://cwe.mitre.org/data/definitions/943.html)
- [CVE-2025-23061](https://nvd.nist.gov/vuln/detail/CVE-2025-23061)
