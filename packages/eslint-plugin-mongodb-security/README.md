# eslint-plugin-mongodb-security

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-mongodb.png" alt="ESLint Interlace - eslint-plugin-mongodb-security" width="100%" />
</div>

> 🔐 Security-focused ESLint plugin for MongoDB & Mongoose. Detects NoSQL injection (CVE-2025-23061), operator attacks, credential exposure, and ODM-specific vulnerabilities with AI-optimized fix guidance.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-mongodb-security.svg)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-mongodb-security.svg)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=mongodb-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=mongodb-security)
[![Jan 2026](https://img.shields.io/badge/Jan_2026-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

---

## 🎯 The One-Stop Shop for MongoDB Security Linting

**This is the comprehensive, actively-maintained ESLint plugin for MongoDB security in Node.js environments.**

> ⚠️ **Note**: Other packages like `eslint-plugin-mongodb` and `eslint-plugin-mongo` exist on npm but are outdated, unmaintained, or limited in scope. **eslint-plugin-mongodb-security** is purpose-built for modern security needs, covering the entire MongoDB ecosystem with CVE detection, OWASP mapping, and AI-optimized error messages.

---

## 💡 What You Get

- **16 Security Rules** — NoSQL injection, operator attacks, credential exposure, ODM patterns
- **Full Ecosystem Coverage** — MongoDB driver, Mongoose ODM, Client-Side Encryption, Typegoose
- **2025 CVE Detection** — CVE-2025-23061, CVE-2024-53900 ($where injection in Mongoose)
- **OWASP Top 10 Mapped** — Every rule references CWE and OWASP categories
- **AI-Optimized** — Structured messages for GitHub Copilot, Cursor, Claude assistance

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-mongodb-security
# or
pnpm add -D eslint-plugin-mongodb-security
```

## 🚀 Quick Start

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import mongodbSecurity from 'eslint-plugin-mongodb-security';

export default [
  mongodbSecurity.configs.recommended,
  // or mongodbSecurity.configs.strict for maximum security
];
```

### Custom Configuration

```javascript
import mongodbSecurity from 'eslint-plugin-mongodb-security';

export default [
  {
    plugins: { 'mongodb-security': mongodbSecurity },
    rules: {
      // Critical - NoSQL Injection
      'mongodb-security/no-unsafe-query': 'error',
      'mongodb-security/no-operator-injection': 'error',
      'mongodb-security/no-unsafe-where': 'error',

      // High - Credentials & Connection
      'mongodb-security/no-hardcoded-connection-string': 'error',
      'mongodb-security/require-tls-connection': 'warn',

      // Medium - ODM Best Practices
      'mongodb-security/require-schema-validation': 'warn',
      'mongodb-security/no-select-sensitive-fields': 'warn',
    },
  },
];
```

---

## 🔐 Rules

💼 = Set in `recommended` | 🔧 = Auto-fixable | 💡 = Has suggestions

### Critical Severity (NoSQL Injection)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-unsafe-query](docs/rules/no-unsafe-query.md) | CWE-943 | A03:2021 |  | Prevents string concatenation in queries | 💼 |  |  | 💡 |  |
| [no-operator-injection](docs/rules/no-operator-injection.md) | CWE-943 | A03:2021 |  | Prevents $ne, $gt, $lt injection attacks | 💼 |  |  | 💡 |  |
| [no-unsafe-where](docs/rules/no-unsafe-where.md) | CWE-943 | A01:2021 |  | Prevents $where operator RCE | 💼 |  |  | 💡 |  |
| [no-unsafe-regex-query](docs/rules/no-unsafe-regex-query.md) | CWE-400 | A03:2021 |  | Prevents ReDoS via $regex | 💼 |  |  | 💡 |  |
### High Severity (Credentials & Connection)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-hardcoded-connection-string](docs/rules/no-hardcoded-connection-string.md) | CWE-798 | A07:2021 |  | Prevents credentials in connection URIs | 💼 |  |  | 💡 |  |
| [no-hardcoded-credentials](docs/rules/no-hardcoded-credentials.md) | CWE-798 | A07:2021 |  | Prevents hardcoded auth options | 💼 |  |  | 💡 |  |
| [require-tls-connection](docs/rules/require-tls-connection.md) | CWE-295 | A02:2021 |  | Requires TLS for production connections | 💼 |  |  | 💡 |  |
| [require-auth-mechanism](docs/rules/require-auth-mechanism.md) | CWE-287 | A07:2021 |  | Requires explicit SCRAM-SHA-256 | 💼 |  |  | 💡 |  |
### Medium Severity (Mongoose ODM)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [require-schema-validation](docs/rules/require-schema-validation.md) | CWE-20 | A04:2021 |  | Requires Mongoose schema validators | 💼 |  |  | 💡 |  |
| [no-select-sensitive-fields](docs/rules/no-select-sensitive-fields.md) | CWE-200 | A01:2021 |  | Prevents returning password/token fields | 💼 |  |  | 💡 |  |
| [no-bypass-middleware](docs/rules/no-bypass-middleware.md) | CWE-284 | A01:2021 |  | Prevents bypassing pre/post hooks | 💼 |  |  | 💡 |  |
| [no-unsafe-populate](docs/rules/no-unsafe-populate.md) | CWE-943 | A03:2021 |  | Prevents user-controlled populate() | 💼 |  |  | 💡 |  |
### Low Severity (Best Practices)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-unbounded-find](docs/rules/no-unbounded-find.md) | CWE-400 | A04:2021 |  | Requires limit() on find queries |  |  |  | 💡 |  |
| [require-projection](docs/rules/require-projection.md) | CWE-200 | A01:2021 |  | Requires field projection |  |  |  | 💡 |  |
| [require-lean-queries](docs/rules/require-lean-queries.md) | CWE-400 | A04:2021 |  | Suggests .lean() for read-only queries |  |  |  | 💡 |  |
| [no-debug-mode-production](docs/rules/no-debug-mode-production.md) | CWE-489 | A05:2021 |  | Prevents debug mode in production | 💼 |  |  | 💡 |  |
---

## 📚 Supported Libraries

This plugin analyzes code that uses the following MongoDB/Mongoose libraries. **Both are optional peer dependencies** — you only need to have installed the ones you're using:

| Library                   | npm                                                             | Detection  | Notes                              |
| ------------------------- | --------------------------------------------------------------- | ---------- | ---------------------------------- |
| mongodb                   | ![npm](https://img.shields.io/npm/dw/mongodb)                   | ✅ Full    | Native MongoDB driver              |
| mongoose                  | ![npm](https://img.shields.io/npm/dw/mongoose)                  | ✅ Full    | ODM with schema validation         |
| @nestjs/mongoose          | ![npm](https://img.shields.io/npm/dw/@nestjs/mongoose)          | ✅ Full    | NestJS integration for Mongoose    |
| mongodb-client-encryption | ![npm](https://img.shields.io/npm/dw/mongodb-client-encryption) | ✅ Full    | Client-Side Field Level Encryption |
| @typegoose/typegoose      | ![npm](https://img.shields.io/npm/dw/@typegoose/typegoose)      | ✅ Partial | TypeScript decorators for Mongoose |

> **Note**: `mongodb` and `mongoose` are listed as optional peer dependencies (`peerDependenciesMeta.optional: true`). The plugin works regardless of which MongoDB library you use — rules detect patterns in your code, not the presence of specific packages.
>
> **Not covered**: `mongodb-core` (deprecated, merged into mongodb 4.x), `mongodb-memory-server` (testing utility).
>
> **NestJS users**: `@nestjs/mongoose` uses standard Mongoose under the hood — all rules apply. For comprehensive NestJS coverage, combine with [`eslint-plugin-nestjs-security`](https://npmjs.com/package/eslint-plugin-nestjs-security).

---

## 🔒 OWASP Top 10 2021 Coverage

| OWASP Category                         | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **A01:2021 Broken Access Control** |  |  |  |  |  |  |  |  |  |
| **A02:2021 Cryptographic Failures** |  |  |  |  |  |  |  |  |  |
| **A03:2021 Injection** |  |  |  |  |  |  |  |  |  |
| **A04:2021 Insecure Design** |  |  |  |  |  |  |  |  |  |
| **A05:2021 Security Misconfiguration** |  |  |  |  |  |  |  |  |  |
| **A07:2021 Identification Failures** |  |  |  |  |  |  |  |  |  |
---

## 🛡️ Security Research Coverage

### CVE-2025-23061 & CVE-2024-53900 (Mongoose $where Injection)

The `no-unsafe-where` rule detects `$where` operator usage that allows RCE through JavaScript injection.

```javascript
// ❌ Vulnerable - Allows Remote Code Execution
User.find({ $where: `this.name === '${userInput}'` });
User.find().populate({ path: 'posts', match: { $where: userControlled } });

// ✅ Safe - Use query operators
User.find({ name: { $eq: sanitize(userInput) } });
```

### NoSQL Operator Injection

The `no-operator-injection` rule prevents authentication bypass attacks.

```javascript
// ❌ Vulnerable - Attacker sends { password: { $ne: null } }
User.findOne({ email: req.body.email, password: req.body.password });

// ✅ Safe - Explicit equality operator
User.findOne({ email: { $eq: email }, password: { $eq: password } });
```

---

## ⚙️ Configuration Presets

| Preset        | Description        | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `recommended` |  |  |  |  |  |  |  |  |  |
| `strict` |  |  |  |  |  |  |  |  |  |
| `mongoose` |  |  |  |  |  |  |  |  |  |
---

## 🤖 AI-Optimized Messages

Every rule uses `formatLLMMessage` for structured output:

```
🔒 CWE-943 OWASP:A03-Injection CVSS:9.0 | NoSQL injection via $where operator | CRITICAL
   Fix: Remove $where and use standard query operators like $eq, $in, $regex
   https://nvd.nist.gov/vuln/detail/CVE-2025-23061
```

---

## 📖 References

- [OWASP NoSQL Injection Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)
- [CVE-2025-23061 - Mongoose populate() bypass](https://nvd.nist.gov/vuln/detail/CVE-2025-23061)
- [CVE-2024-53900 - Mongoose $where RCE](https://nvd.nist.gov/vuln/detail/CVE-2024-53900)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [CWE-943: NoSQL Injection](https://cwe.mitre.org/data/definitions/943.html)

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Downloads                                                                                                                                | Description                                      | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |  |  |  |  |  |  |  |
---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
