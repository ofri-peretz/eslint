<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://www.mongodb.com" target="_blank"><img src="https://eslint.interlace.tools/logos/mongodb.svg" alt="MongoDB" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for MongoDB queries and interactions (NoSQL injection).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mongodb-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mongodb-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-mongodb-security" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-mongodb-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-mongodb-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-mongodb-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for MongoDB queries and interactions (NoSQL injection).

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code *does*, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security). 📚

```bash
npm install eslint-plugin-mongodb-security --save-dev
```

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

## 🏢 Usage Examples
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

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-bypass-middleware](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-bypass-middleware?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-284 | A01:2021 |  | Detects Mongoose operations that bypass middleware hooks (pre/post hooks). | 🟢 |  | ⚠️ |  |  |  |
| [no-debug-mode-production](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-debug-mode-production?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-489 | A05:2021 |  | Detects Mongoose debug mode that could expose sensitive query information in production. | 🟢 | 💼 |  |  | 💡 |  |
| [no-hardcoded-connection-string](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-connection-string?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-798 | A07:2021 |  | Detects hardcoded MongoDB connection strings containing credentials in source code. | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-798 | A07:2021 |  | Detects hardcoded MongoDB authentication credentials in connection options. | 🟢 | 💼 |  |  |  |  |
| [no-operator-injection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-operator-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Detects MongoDB operator injection attacks where user input is passed directly as query values, allowing at… | 🟢 | 💼 |  |  |  |  |
| [no-select-sensitive-fields](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-select-sensitive-fields?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-200 | A01:2021 |  | Detects queries that may return sensitive fields like passwords, tokens, or API keys. | 🟢 |  | ⚠️ |  |  |  |
| [no-unbounded-find](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unbounded-find?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A04:2021 |  | Requires limit() on find queries to prevent resource exhaustion from unbounded result sets. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-unsafe-populate](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-populate?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Detects user-controlled populate() paths that could lead to data exposure or injection. | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Prevents NoSQL injection by detecting direct use of user input in MongoDB query objects. | 🟢 | 💼 |  |  | 💡 |  |
| [no-unsafe-regex-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-regex-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A03:2021 |  | Detects user input in MongoDB $regex operators that could cause ReDoS (Regular Expression Denial of Service… | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-where](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-where?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A01:2021 |  | Prevents use of the dangerous $where operator which executes JavaScript on the MongoDB server, enabling Rem… | 🟢 | 💼 |  |  |  |  |
| [require-auth-mechanism](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-auth-mechanism?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-287 | A07:2021 |  | Requires explicit authentication mechanism specification for MongoDB connections. | 🟢 |  | ⚠️ |  |  |  |
| [require-lean-queries](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-lean-queries?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A04:2021 |  | Suggests using .lean() for read-only Mongoose queries to reduce memory usage. | 🟢 |  |  |  | 💡 |  |
| [require-projection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-projection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-200 | A01:2021 |  | Requires field projection on queries to minimize data exposure. | 🟢 |  |  |  |  |  |
| [require-schema-validation](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-schema-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-20 | A04:2021 |  | Requires validation options on Mongoose schema fields to prevent invalid or malicious data. | 🟢 |  | ⚠️ |  |  |  |
| [require-tls-connection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-tls-connection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-295 | A02:2021 |  | Requires TLS/SSL encryption for MongoDB connections in production environments. | 🟢 |  | ⚠️ |  | 💡 |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK security. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | XSS, DOM security. |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-drizzle-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | Drizzle security. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express middleware hardening. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security) | Google Gemini SDK security. |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt-security) | Token security. |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-knex-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-knex-security) | Knex security. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda hardening. |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | MCP SDK security. |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mysql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mysql-security) | MySQL security. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS framework hardening. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Server-side patterns. |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security) | OpenAI SDK security. |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-postgresql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | PostgreSQL security. |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-prisma-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prisma-security) | Prisma security. |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Injection prevention. |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | Sequelize ORM security. |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | SQLite security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | AI SDK security. |

**Code quality**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-conventions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-conventions) | Team-specific habits and styles. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Fast cycle + import-graph analysis. |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns. |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization) | ESNext migration + syntax evolution. |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity) | Structural integrity and DDD patterns. |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability) | Production readiness and resource health. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y) | React accessibility / WCAG. |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features) | React best practices and optimization. |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability) | Runtime stability and error safety. |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security"><img src="https://eslint.interlace.tools/images/og-mongodb-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
