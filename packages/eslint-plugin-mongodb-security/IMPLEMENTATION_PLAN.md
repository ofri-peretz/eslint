# eslint-plugin-mongodb-security - Implementation Plan

> 🔐 Security-focused ESLint plugin for MongoDB & Mongoose. Detects NoSQL injection, operator attacks, credential exposure, and ODM-specific vulnerabilities with AI-optimized fix guidance.

---

## 📦 Supported Packages

| Package                       | npm Downloads                                                   | Detection  | Description                                |
| ----------------------------- | --------------------------------------------------------------- | ---------- | ------------------------------------------ |
| **mongodb**                   | ![npm](https://img.shields.io/npm/dw/mongodb)                   | ✅ Full    | Official MongoDB Node.js Driver            |
| **mongoose**                  | ![npm](https://img.shields.io/npm/dw/mongoose)                  | ✅ Full    | MongoDB Object Data Modeling (ODM)         |
| **mongodb-client-encryption** | ![npm](https://img.shields.io/npm/dw/mongodb-client-encryption) | ✅ Full    | Client-Side Field Level Encryption (CSFLE) |
| **@typegoose/typegoose**      | ![npm](https://img.shields.io/npm/dw/@typegoose/typegoose)      | ✅ Partial | TypeScript wrapper for Mongoose            |

---

## 🔒 Security Research Foundation

### CVE Coverage

| CVE                             | CVSS | Package                   | Description                                              | Rule                            |
| ------------------------------- | ---- | ------------------------- | -------------------------------------------------------- | ------------------------------- |
| **CVE-2025-23061**              | 9.0  | mongoose                  | `$where` operator injection via `populate()`             | `no-unsafe-where`               |
| **CVE-2024-53900**              | 8.1  | mongoose                  | `$where` operator RCE in query filters                   | `no-unsafe-where`               |
| **CVE-2021-20327**              | 7.5  | mongodb-client-encryption | MitM attack on KMS certificate validation                | `require-encryption-validation` |
| **CVE-2025-14847** (MongoBleed) | 9.8  | mongodb-server            | Memory leak via zlib compression (server-side awareness) | Documentation                   |

### CWE Coverage

| CWE         | Description                     | Rules                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------- |
| **CWE-943** | NoSQL Injection                 | `no-unsafe-query`, `no-operator-injection`, `no-unsafe-where` |
| **CWE-798** | Hardcoded Credentials           | `no-hardcoded-connection-string`, `no-hardcoded-credentials`  |
| **CWE-295** | Improper Certificate Validation | `require-tls-connection`, `require-encryption-validation`     |
| **CWE-400** | Resource Exhaustion             | `no-unbounded-find`, `no-unsafe-regex-query`                  |
| **CWE-200** | Information Exposure            | `no-select-sensitive-fields`, `require-projection`            |
| **CWE-20**  | Improper Input Validation       | `require-schema-validation`, `no-dynamic-schema`              |
| **CWE-362** | Race Condition                  | `no-transaction-race`                                         |
| **CWE-489** | Debug Code                      | `no-debug-mode-production`                                    |

### OWASP Top 10 2021 Mapping

| OWASP   | Category                  | Rules                                                                                  | Coverage |
| ------- | ------------------------- | -------------------------------------------------------------------------------------- | -------- |
| **A01** | Broken Access Control     | `no-unsafe-where`, `require-auth-middleware`                                           | ✅       |
| **A02** | Cryptographic Failures    | `require-tls-connection`, `no-hardcoded-credentials`                                   | ✅       |
| **A03** | Injection                 | `no-unsafe-query`, `no-operator-injection`, `no-unsafe-where`, `no-unsafe-regex-query` | ✅       |
| **A04** | Insecure Design           | `require-schema-validation`, `no-unbounded-find`                                       | ✅       |
| **A05** | Security Misconfiguration | `require-tls-connection`, `no-debug-mode-production`                                   | ✅       |
| **A06** | Vulnerable Components     | `no-outdated-mongoose-patterns`                                                        | ✅       |
| **A07** | Identification Failures   | `no-hardcoded-credentials`, `require-auth-mechanism`                                   | ✅       |

---

## 📋 Rule Specifications (16 Rules)

### Critical Severity (NoSQL Injection - 4 Rules)

#### 1. `no-unsafe-query`

- **CWE**: CWE-943 (NoSQL Injection)
- **OWASP**: A03:2021 Injection
- **CVSS**: 9.8
- **Detects**: String concatenation/template literals in MongoDB queries

```typescript
// ❌ Vulnerable
db.collection('users').find({ username: req.body.username });
User.find({ email: req.query.email });

// ✅ Safe - Parameterized
db.collection('users').find({ username: { $eq: sanitize(req.body.username) } });
```

#### 2. `no-operator-injection`

- **CWE**: CWE-943 (NoSQL Injection)
- **OWASP**: A03:2021 Injection
- **CVSS**: 9.1
- **Detects**: User input directly used in query operators ($ne, $gt, $lt, $in, $regex)

```typescript
// ❌ Vulnerable - Allows { password: { $ne: null } } bypass
User.find({ password: req.body.password });

// ✅ Safe - Explicit equality
User.find({ password: { $eq: sanitize(req.body.password) } });
```

#### 3. `no-unsafe-where`

- **CWE**: CWE-943 (NoSQL Injection)
- **OWASP**: A01:2021 Broken Access Control
- **CVSS**: 9.0
- **CVE**: CVE-2025-23061, CVE-2024-53900
- **Detects**: `$where` operator usage with user input

```typescript
// ❌ Vulnerable - Allows RCE (CVE-2025-23061)
db.collection('users').find({ $where: `this.name === '${userInput}'` });
User.find().where('age').gt(userInput);

// ❌ Vulnerable - $where nested in $or
User.find({ $or: [{ $where: userControlled }] });

// ✅ Safe - Avoid $where entirely
db.collection('users').find({ name: { $eq: sanitize(userInput) } });
```

#### 4. `no-unsafe-regex-query`

- **CWE**: CWE-400 (Resource Exhaustion), CWE-943 (Injection)
- **OWASP**: A03:2021 Injection
- **CVSS**: 7.5
- **Detects**: Unvalidated user input in $regex patterns

```typescript
// ❌ Vulnerable - ReDoS + Information disclosure
User.find({ name: { $regex: req.query.search } });

// ✅ Safe - Anchored, escaped pattern
User.find({ name: { $regex: `^${escapeRegex(search)}`, $options: 'i' } });
```

### High Severity (Credentials & Connection - 4 Rules)

#### 5. `no-hardcoded-connection-string`

- **CWE**: CWE-798 (Hardcoded Credentials)
- **OWASP**: A07:2021 Identification Failures
- **CVSS**: 7.5

```typescript
// ❌ Vulnerable
mongoose.connect('mongodb://admin:password123@localhost:27017/mydb');
new MongoClient('mongodb+srv://user:pass@cluster.mongodb.net');

// ✅ Safe
mongoose.connect(process.env.MONGODB_URI);
```

#### 6. `no-hardcoded-credentials`

- **CWE**: CWE-798 (Hardcoded Credentials)
- **OWASP**: A07:2021 Identification Failures
- **CVSS**: 7.5

```typescript
// ❌ Vulnerable
new MongoClient(uri, { auth: { username: 'admin', password: 'secret123' } });

// ✅ Safe
new MongoClient(uri, {
  auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS },
});
```

#### 7. `require-tls-connection`

- **CWE**: CWE-295 (Improper Certificate Validation)
- **OWASP**: A02:2021 Cryptographic Failures
- **CVSS**: 7.4

```typescript
// ❌ Vulnerable - No TLS
mongoose.connect('mongodb://localhost:27017/mydb');
new MongoClient(uri, { tls: false });

// ✅ Safe
mongoose.connect('mongodb://localhost:27017/mydb', {
  tls: true,
  tlsCAFile: '/path/to/ca.pem',
});
new MongoClient(uri, { tls: true });
```

#### 8. `require-auth-mechanism`

- **CWE**: CWE-287 (Improper Authentication)
- **OWASP**: A07:2021 Identification Failures
- **CVSS**: 6.5

```typescript
// ⚠️ Warning - Default auth mechanism
mongoose.connect(uri);

// ✅ Safe - Explicit SCRAM-SHA-256
mongoose.connect(uri, { authMechanism: 'SCRAM-SHA-256' });
```

### Medium Severity (Mongoose ODM Specific - 5 Rules)

#### 9. `require-schema-validation`

- **CWE**: CWE-20 (Improper Input Validation)
- **OWASP**: A04:2021 Insecure Design
- **CVSS**: 6.1

```typescript
// ❌ Vulnerable - No validation
const userSchema = new Schema({ email: String });

// ✅ Safe - With validation
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    validate: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  },
});
```

#### 10. `no-select-sensitive-fields`

- **CWE**: CWE-200 (Information Exposure)
- **OWASP**: A01:2021 Broken Access Control
- **CVSS**: 5.3

```typescript
// ❌ Vulnerable - Returns password hash
User.findById(userId);

// ✅ Safe - Explicit projection
User.findById(userId).select('-password -refreshToken');
```

#### 11. `no-bypass-middleware`

- **CWE**: CWE-284 (Improper Access Control)
- **OWASP**: A01:2021 Broken Access Control
- **CVSS**: 5.3

```typescript
// ❌ Vulnerable - Bypasses pre/post hooks
Model.findOneAndUpdate(query, update);
Model.updateMany(query, update);

// ✅ Safe - Uses middleware
const doc = await Model.findOne(query);
doc.field = update.field;
await doc.save();
```

#### 12. `require-lean-queries`

- **CWE**: CWE-400 (Resource Exhaustion)
- **OWASP**: A04:2021 Insecure Design
- **CVSS**: 4.3
- **Note**: Suggestion, not error

```typescript
// ⚠️ Suggestion - Full Mongoose documents
const users = await User.find({ active: true });

// ✅ Optimized - Plain JS objects
const users = await User.find({ active: true }).lean();
```

#### 13. `no-unsafe-populate`

- **CWE**: CWE-943 (NoSQL Injection)
- **OWASP**: A03:2021 Injection
- **CVSS**: 6.5
- **CVE**: Related to CVE-2025-23061

```typescript
// ❌ Vulnerable - User-controlled population
User.findById(id).populate(req.query.populate);

// ✅ Safe - Hardcoded paths
User.findById(id).populate('profile');
```

### Low Severity (Best Practices - 3 Rules)

#### 14. `no-unbounded-find`

- **CWE**: CWE-400 (Resource Exhaustion)
- **OWASP**: A04:2021 Insecure Design
- **CVSS**: 4.3

```typescript
// ⚠️ Warning - No limit
User.find({});

// ✅ Safe
User.find({}).limit(100);
```

#### 15. `require-projection`

- **CWE**: CWE-200 (Information Exposure)
- **OWASP**: A01:2021 Broken Access Control
- **CVSS**: 3.7

```typescript
// ⚠️ Warning - Returns all fields
db.collection('users').findOne({ _id: id });

// ✅ Safe
db.collection('users').findOne(
  { _id: id },
  { projection: { name: 1, email: 1 } },
);
```

#### 16. `no-debug-mode-production`

- **CWE**: CWE-489 (Active Debug Code)
- **OWASP**: A05:2021 Security Misconfiguration
- **CVSS**: 3.1

```typescript
// ❌ Vulnerable in production
mongoose.set('debug', true);

// ✅ Safe
mongoose.set('debug', process.env.NODE_ENV !== 'production');
```

---

## 🚀 Implementation Steps

### Phase 1: Project Setup

```bash
# 1. Create plugin using Nx generator
cd /Users/ofri/repos/ofriperetz.dev/eslint
pnpm nx g @nx/js:library eslint-plugin-mongodb-security \
  --directory=packages/eslint-plugin-mongodb-security \
  --buildable \
  --publishable \
  --importPath=eslint-plugin-mongodb-security

# 2. Install devDependencies
cd packages/eslint-plugin-mongodb-security
pnpm add -D mongodb mongoose mongodb-client-encryption @typegoose/typegoose
pnpm add -D @typescript-eslint/parser @typescript-eslint/rule-tester

# 3. Add runtime dependency
pnpm add @interlace/eslint-devkit tslib
```

### Phase 2: File Structure

```
packages/eslint-plugin-mongodb-security/
├── .npmignore
├── AGENTS.md                    # AI agent resolution strategies
├── CHANGELOG.md
├── LICENSE
├── README.md
├── docs/
│   └── rules/                   # Rule documentation
│       ├── no-unsafe-query.md
│       ├── no-operator-injection.md
│       └── ...
├── eslint.config.mjs
├── package.json
├── project.json
├── src/
│   ├── constants.ts             # Shared constants
│   ├── index.spec.ts            # Plugin integration tests
│   ├── index.ts                 # Plugin entry point
│   ├── rules/
│   │   ├── no-unsafe-query/
│   │   │   ├── index.ts
│   │   │   └── index.spec.ts
│   │   ├── no-operator-injection/
│   │   │   ├── index.ts
│   │   │   └── index.spec.ts
│   │   └── ...
│   └── types/
│       └── index.ts             # Shared types
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
└── vitest.config.mts
```

### Phase 3: Implementation Order

| Order | Rule                             | Priority       | Complexity | Est. Hours |
| ----- | -------------------------------- | -------------- | ---------- | ---------- |
| 1     | `no-unsafe-query`                | Critical       | Medium     | 4h         |
| 2     | `no-operator-injection`          | Critical       | High       | 6h         |
| 3     | `no-unsafe-where`                | Critical (CVE) | High       | 6h         |
| 4     | `no-hardcoded-connection-string` | High           | Low        | 2h         |
| 5     | `no-hardcoded-credentials`       | High           | Low        | 2h         |
| 6     | `require-tls-connection`         | High           | Medium     | 3h         |
| 7     | `no-unsafe-regex-query`          | Critical       | Medium     | 4h         |
| 8     | `require-schema-validation`      | Medium         | Medium     | 4h         |
| 9     | `no-select-sensitive-fields`     | Medium         | Medium     | 3h         |
| 10    | `no-bypass-middleware`           | Medium         | Medium     | 3h         |
| 11    | `no-unsafe-populate`             | Medium (CVE)   | High       | 5h         |
| 12    | `require-auth-mechanism`         | High           | Low        | 2h         |
| 13    | `no-unbounded-find`              | Low            | Low        | 2h         |
| 14    | `require-projection`             | Low            | Low        | 2h         |
| 15    | `require-lean-queries`           | Low            | Low        | 2h         |
| 16    | `no-debug-mode-production`       | Low            | Low        | 1h         |

**Total Estimated Hours: ~51 hours**

---

## 📝 package.json Template

```json
{
  "name": "eslint-plugin-mongodb-security",
  "version": "1.0.0",
  "description": "ESLint plugin with security and best practices rules for MongoDB and Mongoose",
  "type": "commonjs",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.d.ts",
      "default": "./src/index.js"
    }
  },
  "author": "Ofri Peretz <ofriperetzdev@gmail.com>",
  "license": "MIT",
  "homepage": "https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/README.md",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ofri-peretz/eslint.git",
    "directory": "packages/eslint-plugin-mongodb-security"
  },
  "bugs": {
    "url": "https://github.com/ofri-peretz/eslint/issues"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": ["src/", "dist/", "README.md", "LICENSE"],
  "keywords": [
    "eslint",
    "eslint-plugin",
    "mongodb",
    "mongoose",
    "nosql",
    "security",
    "injection",
    "best-practices",
    "owasp",
    "cwe"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "mongodb": "^4.0.0 || ^5.0.0 || ^6.0.0",
    "mongoose": "^6.0.0 || ^7.0.0 || ^8.0.0"
  },
  "peerDependenciesMeta": {
    "mongodb": { "optional": true },
    "mongoose": { "optional": true }
  },
  "dependencies": {
    "@interlace/eslint-devkit": "^1.2.1",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@typescript-eslint/parser": "^8.46.2",
    "@typescript-eslint/rule-tester": "^8.46.2",
    "mongodb": "^6.12.0",
    "mongoose": "^8.9.0",
    "mongodb-client-encryption": "^6.1.0",
    "@typegoose/typegoose": "^12.0.0"
  }
}
```

---

## 🔗 References

### MongoDB Security

- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [OWASP NoSQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)
- [CWE-943: NoSQL Injection](https://cwe.mitre.org/data/definitions/943.html)

### CVE Resources

- [CVE-2025-23061 - Mongoose $where bypass](https://nvd.nist.gov/vuln/detail/CVE-2025-23061)
- [CVE-2024-53900 - Mongoose populate() RCE](https://nvd.nist.gov/vuln/detail/CVE-2024-53900)
- [CVE-2021-20327 - mongodb-client-encryption MitM](https://nvd.nist.gov/vuln/detail/CVE-2021-20327)

### Mongoose Security

- [Mongoose Security Best Practices](https://mongoosejs.com/docs/security.html)
- [Mongoose 8.x Security Advisory](https://github.com/Automattic/mongoose/security/advisories)

---

## ✅ Success Criteria

- [ ] 16 rules implemented with comprehensive tests
- [ ] 100% CVE coverage for known Mongoose/MongoDB vulnerabilities
- [ ] OWASP Top 10 2021 A01-A07 coverage
- [ ] AI-optimized messages with formatLLMMessage
- [ ] README follows JWT plugin format with Supported Libraries table
- [ ] AGENTS.md for AI agent resolution strategies
- [ ] Published to npm with OIDC provenance
- [ ] Added to PACKAGE_REGISTRY.md
- [ ] Distribution articles created

---

_Last Updated: 2026-01-02_
_Estimated Completion: 1-2 weeks_
