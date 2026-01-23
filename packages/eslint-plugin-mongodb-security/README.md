<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for MongoDB queries and interactions (NoSQL injection).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mongodb-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mongodb-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=mongodb-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=mongodb-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin is essential for securing specific MongoDB interactions, primarily focusing on preventing NoSQL injection attacks. It analyzes your queries and database operations to flag potentially unsafe patterns that could be exploited by malicious actors. By adopting these rules, you can safeguard your data integrity and prevent unauthorized access through injection vulnerabilities.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/mongodb-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/mongodb-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/mongodb-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/mongodb-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/mongodb-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/mongodb-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-mongodb-security --save-dev
```

## Usage Examples

### Prevent NoSQL Injection (`no-operator-injection`)

```javascript
// ❌ Incorrect (Vulnerable to { $ne: null })
User.findOne({ email: req.body.email, password: req.body.password });

// ✅ Correct (Safe execution)
User.findOne({ email: { $eq: email }, password: { $eq: password } });
```

### Prevent JavaScript Injection (`no-unsafe-where`)

```javascript
// ❌ Incorrect (Allows RCE)
User.find({ $where: `this.name === '${userInput}'` });

// ✅ Correct (Standard operators)
User.find({ name: { $eq: sanitize(userInput) } });
```

---

## ⚙️ Configuration Presets

| Preset        | Description                                       |
| :------------ | :------------------------------------------------ |
| `recommended` | Critical rules as errors, high as warnings        |
| `strict`      | All rules as errors                               |
| `mongoose`    | Specialized rules for Mongoose ODM usage patterns |

## 📚 Supported Libraries

| Library    | npm                                                                                                           | Downloads                                                                                                            | Detection                    |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `mongodb`  | [![npm](https://img.shields.io/npm/v/mongodb.svg?style=flat-square)](https://www.npmjs.com/package/mongodb)   | [![downloads](https://img.shields.io/npm/dt/mongodb.svg?style=flat-square)](https://www.npmjs.com/package/mongodb)   | Injection, Unbounded Queries |
| `mongoose` | [![npm](https://img.shields.io/npm/v/mongoose.svg?style=flat-square)](https://www.npmjs.com/package/mongoose) | [![downloads](https://img.shields.io/npm/dt/mongoose.svg?style=flat-square)](https://www.npmjs.com/package/mongoose) | Schema Safety, Leans         |

---

---

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                      |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                          |   CWE    |  OWASP   | CVSS | Description                                                                    | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------- | :------: | :------: | :--: | :----------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [`no-bypass-middleware`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-bypass-middleware)                     | CWE-284  | A01:2025 | 7.5  | [no-bypass-middleware](docs/rules/no-bypass-middleware.md)                     | 💼  | ⚠️  |     |     |     |
| [`no-debug-mode-production`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-debug-mode-production)             | CWE-489  | A05:2025 | 7.5  | [no-debug-mode-production](docs/rules/no-debug-mode-production.md)             | 💼  |     |     |     |     |
| [`no-hardcoded-connection-string`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-hardcoded-connection-string) | CWE-798  | A07:2025 | 9.8  | [no-hardcoded-connection-string](docs/rules/no-hardcoded-connection-string.md) | 💼  |     | 🔧  |     |     |
| [`no-hardcoded-credentials`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-hardcoded-credentials)             | CWE-798  | A07:2025 | 9.8  | [no-hardcoded-credentials](docs/rules/no-hardcoded-credentials.md)             | 💼  |     | 🔧  |     |     |
| [`no-operator-injection`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-operator-injection)                   | CWE-943  | A03:2025 | 9.8  | [no-operator-injection](docs/rules/no-operator-injection.md)                   | 💼  |     |     |     |     |
| [`no-select-sensitive-fields`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-select-sensitive-fields)         | CWE-200  | A01:2025 | 5.3  | [no-select-sensitive-fields](docs/rules/no-select-sensitive-fields.md)         | 💼  | ⚠️  |     |     |     |
| [`no-unbounded-find`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-unbounded-find)                           | CWE-770  | A04:2025 | 5.3  | [no-unbounded-find](docs/rules/no-unbounded-find.md)                           | 💼  | ⚠️  |     |     |     |
| [`no-unsafe-populate`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-unsafe-populate)                         | CWE-284  | A01:2025 | 5.3  | [no-unsafe-populate](docs/rules/no-unsafe-populate.md)                         | 💼  |     |     |     |     |
| [`no-unsafe-query`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-unsafe-query)                               | CWE-943  | A03:2025 | 9.8  | [no-unsafe-query](docs/rules/no-unsafe-query.md)                               | 💼  |     |     |     |     |
| [`no-unsafe-regex-query`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-unsafe-regex-query)                   | CWE-1333 | A03:2025 | 7.5  | [no-unsafe-regex-query](docs/rules/no-unsafe-regex-query.md)                   | 💼  |     |     |     |     |
| [`no-unsafe-where`](https://eslint.interlace.tools/docs/mongodb-security/rules/no-unsafe-where)                               | CWE-943  | A03:2025 | 9.8  | [no-unsafe-where](docs/rules/no-unsafe-where.md)                               | 💼  |     |     |     |     |
| [`require-auth-mechanism`](https://eslint.interlace.tools/docs/mongodb-security/rules/require-auth-mechanism)                 | CWE-306  | A07:2025 | 7.5  | [require-auth-mechanism](docs/rules/require-auth-mechanism.md)                 | 💼  | ⚠️  |     |     |     |
| [`require-lean-queries`](https://eslint.interlace.tools/docs/mongodb-security/rules/require-lean-queries)                     | CWE-400  | A04:2025 | 5.3  | [require-lean-queries](docs/rules/require-lean-queries.md)                     |     |     | 🔧  |     |     |
| [`require-projection`](https://eslint.interlace.tools/docs/mongodb-security/rules/require-projection)                         | CWE-200  | A01:2025 | 5.3  | [require-projection](docs/rules/require-projection.md)                         |     |     |     |     |     |
| [`require-schema-validation`](https://eslint.interlace.tools/docs/mongodb-security/rules/require-schema-validation)           |  CWE-20  | A04:2025 | 7.5  | [require-schema-validation](docs/rules/require-schema-validation.md)           | 💼  | ⚠️  |     |     |     |
| [`require-tls-connection`](https://eslint.interlace.tools/docs/mongodb-security/rules/require-tls-connection)                 | CWE-319  | A02:2025 | 7.5  | [require-tls-connection](docs/rules/require-tls-connection.md)                 | 💼  | ⚠️  |     |     |     |

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/mongodb-security"><img src="https://eslint.interlace.tools/images/og-mongodb-security.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
