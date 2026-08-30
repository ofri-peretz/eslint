<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Reliability rules for defensive programming, error handling, and async correctness.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-reliability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-reliability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-reliability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-reliability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Reliability rules for defensive programming, error handling, and async correctness.

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

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability). 📚

```bash
npm install eslint-plugin-reliability --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                   |
| :------------ | :-------------------------------------------- |
| `recommended` | Balanced reliability checks for most projects |

---

## 🏢 Usage Example
```js
// eslint.config.js
import reliability from 'eslint-plugin-reliability';

export default [reliability.configs.recommended];
```

---

## Why These Rules?
### `no-silent-errors`

Empty catch blocks hide errors, making debugging impossible.

```ts
// ❌ Bad: Silent error swallowing
try {
  await processPayment(order);
} catch (e) {
  // Error is silently ignored!
}

// ✅ Good: Handle or log the error
try {
  await processPayment(order);
} catch (e) {
  logger.error('Payment processing failed', { orderId: order.id, error: e });
  throw new PaymentError('Payment failed', { cause: e });
}
```

### `no-missing-null-checks`

Catches potential `null` or `undefined` dereferences.

```ts
// ❌ Bad: Potential runtime error
function greet(user: User | null) {
  return `Hello, ${user.name}`; // TypeError if user is null!
}

// ✅ Good: Null-safe access
function greet(user: User | null) {
  return user ? `Hello, ${user.name}` : 'Hello, guest';
}
```

### `require-network-timeout`

Network requests without timeouts can hang indefinitely.

```ts
// ❌ Bad: No timeout, can hang forever
const response = await fetch('/api/data');

// ✅ Good: Request with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const response = await fetch('/api/data', {
  signal: controller.signal,
});
clearTimeout(timeoutId);
```

### `no-await-in-loop`

Sequential awaits in loops cause N+1 performance issues.

```ts
// ❌ Bad: Sequential requests (slow)
for (const id of userIds) {
  const user = await fetchUser(id); // N sequential requests
  results.push(user);
}

// ✅ Good: Parallel requests (fast)
const results = await Promise.all(userIds.map((id) => fetchUser(id)));
```

---

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
| [error-message](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/error-message?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | Enforce providing a message when creating built-in Error objects for better debugging. This rule is part of… | 🟢 |  |  |  | 💡 |  |
| [no-await-in-loop](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-await-in-loop?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | Disallow await inside loops without considering concurrency implications | 🟢 |  |  |  | 💡 |  |
| [no-jsdoc-terminator-in-example](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-jsdoc-terminator-in-example?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | Detect `*/` sequences inside JSDoc `@example` blocks that prematurely close the JSDoc comment. | 🟢 |  |  |  | 💡 |  |
| [no-missing-error-context](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-error-context?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [no-missing-null-checks](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-null-checks?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) | CWE-476 |  |  | ESLint Rule: no-missing-null-checks with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-silent-errors](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-silent-errors?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix capabilities. | 🟢 | 💼 |  |  | 💡 |  |
| [no-unhandled-promise](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unhandled-promise?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) | CWE-1024 |  |  | Disallow unhandled Promise rejections with LLM-optimized suggestions for proper async error handling. This… | 🟢 |  |  |  | 💡 |  |
| [no-unsafe-type-narrowing](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unsafe-type-narrowing?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | ESLint Rule: no-unsafe-type-narrowing with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [require-network-timeout](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/require-network-timeout?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability) |  |  |  | Require timeout configuration for network requests. This rule is part of eslint-plugin-reliability and prov… | 🟢 | 💼 |  |  | 💡 |  |
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
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB injection. |
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

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability"><img src="https://eslint.interlace.tools/images/og-reliability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-reliability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
