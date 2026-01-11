# eslint-plugin-mongodb-security

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-mongodb.png" alt="ESLint Interlace - eslint-plugin-mongodb-security" width="200" />
</div>

Security rules for MongoDB queries and interactions.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-mongodb-security.svg)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-mongodb-security.svg)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=mongodb-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=mongodb-security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/mongodb-security](https://eslint.interlace.tools/docs/mongodb-security)
>
> **Note**: `mongodb` and `mongoose` are listed as optional peer dependencies (`peerDependenciesMeta.optional: true`). The plugin works regardless of which MongoDB library you use — rules detect patterns in your code, not the presence of specific packages.
>
> **Not covered**: `mongodb-core` (deprecated, merged into mongodb 4.x), `mongodb-memory-server` (testing utility).
>
> **NestJS users**: `@nestjs/mongoose` uses standard Mongoose under the hood — all rules apply. For comprehensive NestJS coverage, combine with [`eslint-plugin-nestjs-security`](https://npmjs.com/package/eslint-plugin-nestjs-security).

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-mongodb-security --save-dev
```

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

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |
---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
