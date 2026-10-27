<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://expressjs.com" target="_blank"><img src="https://eslint.interlace.tools/logos/express.svg" alt="Express" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-express-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-express-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-express-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-express-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-express-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-express-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-express-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security). It carries the same rules under the same IDs (`express-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 28 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code _does_, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

## Getting Started

```bash
npm install oxlint-plugin-express-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-express-security'],
    rules: {
      'express-security/no-cors-credentials-wildcard': 'error',
      'express-security/no-disabled-helmet-protections': 'error',
      'express-security/no-error-details-in-response': 'error',
      'express-security/no-exposed-debug-endpoints': 'error',
      'express-security/no-express-unsafe-regex-route': 'error',
      'express-security/no-host-header-in-links': 'error',
      'express-security/no-insecure-cookie-options': 'error',
      'express-security/no-permissive-cors': 'error',
      'express-security/no-permissive-trust-proxy': 'error',
      'express-security/no-static-root-exposure': 'error',
      'express-security/no-unsafe-csp-directives': 'error',
      'express-security/no-user-controlled-redirect': 'error',
      'express-security/no-user-controlled-render-locals': 'error',
      'express-security/require-helmet': 'error',
      'express-security/require-rate-limiting': 'error',
      'express-security/require-strict-transport-security': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-express-security"],
  "rules": {
    "express-security/no-cors-credentials-wildcard": "error",
    "express-security/no-disabled-helmet-protections": "error",
    "express-security/no-error-details-in-response": "error",
    "express-security/no-exposed-debug-endpoints": "error",
    "express-security/no-express-unsafe-regex-route": "error",
    "express-security/no-host-header-in-links": "error",
    "express-security/no-insecure-cookie-options": "error",
    "express-security/no-permissive-cors": "error",
    "express-security/no-permissive-trust-proxy": "error",
    "express-security/no-static-root-exposure": "error",
    "express-security/no-unsafe-csp-directives": "error",
    "express-security/no-user-controlled-redirect": "error",
    "express-security/no-user-controlled-render-locals": "error",
    "express-security/require-helmet": "error",
    "express-security/require-rate-limiting": "error",
    "express-security/require-strict-transport-security": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) instead. It has the same rules, plus presets for ESLint's flat config.

## 📦 Compatibility

| Package | Version                                                          |
| :------ | :--------------------------------------------------------------- |
| oxlint  | verified on `1.88.0`: CI loads every rule ID through `jsPlugins` |
| Vite+   | `lint.jsPlugins` in `vite.config.ts`                             |
| Node.js | `>=18.0.0`                                                       |

## Rules

**Legend**

| Icon | Description                                                               |
| :--: | :------------------------------------------------------------------------ |
|  💼  | **Recommended**: Included in the recommended preset.                      |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                             |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option.        |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                       |
|  🚫  | **Deprecated**: This rule is deprecated.                                  |
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.                |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it.        |

| Rule                                                                                                                                                                                                                                    |   CWE    |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-client-controlled-authorization](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-client-controlled-authorization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)   | CWE-863  | A01:2021 |      | This rule detects access decisions taken on request-supplied role, permission or identity values — the chec… | 🟢  |     | ⚠️  |     |     |     |
| [no-cors-credentials-wildcard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-cors-credentials-wildcard?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)               | CWE-942  |          |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [no-disabled-helmet-protections](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-disabled-helmet-protections?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)           | CWE-693  | A05:2021 |      | This rule detects helmet options that switch a shipped security-header default off, leaving a mounted helme… | 🟢  | 💼  |     |     |     |     |
| [no-error-details-in-response](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-error-details-in-response?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)               | CWE-209  | A04:2021 |      | Disallow sending caught error objects, stack traces, or spreads of them in HTTP responses.                   | 🟢  | 💼  |     |     |     |     |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-exposed-debug-endpoints?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                   | CWE-489  | A05:2021 |      | Identifies potential debug, administration, or testing endpoints that are often left exposed in production…  | 🟢  | 💼  |     |     |     |     |
| [no-express-unsafe-regex-route](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-express-unsafe-regex-route?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)             | CWE-1333 |          |      | This rule detects Regular Expression Denial of Service (ReDoS) vulnerabilities in Express route patterns     | 🟢  | 💼  |     |     |     |     |
| [no-graphql-introspection-production](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-graphql-introspection-production?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security) | CWE-200  |          |      | This rule detects GraphQL servers with introspection enabled in production                                   | 🟢  |     | ⚠️  |     |     |     |
| [no-host-header-in-links](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-host-header-in-links?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                         | CWE-640  | A07:2021 |      | Disallow building absolute URLs (password-reset and verification links) from the Host or X-Forwarded-Host r… | 🟢  | 💼  |     |     |     |     |
| [no-idor-resource-access](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-idor-resource-access?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                         | CWE-639  | A01:2021 |      | This rule detects a resource fetched by an identifier taken straight from the request inside a handler that… | 🟢  |     | ⚠️  |     |     |     |
| [no-insecure-cookie-options](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-insecure-cookie-options?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                   | CWE-614  |          |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [no-missing-cors-check](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-cors-check?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                             | CWE-346  |          |      | Detects missing CORS validation (wildcard CORS, missing origin check)                                        | 🟢  |     |     |     |     |     |
| [no-missing-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-csrf-protection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                   | CWE-352  |          |      | Detects missing CSRF token validation in POST/PUT/DELETE requests                                            | 🟢  |     |     |     |     |     |
| [no-missing-security-headers](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-security-headers?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                 | CWE-693  |          |      | Detects missing security headers in HTTP responses                                                           | 🟢  |     |     |     |     |     |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-permissive-cors?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                                   | CWE-942  |          |      | Detects overly permissive CORS configurations in Express.js applications                                     | 🟢  | 💼  |     |     |     |     |
| [no-permissive-trust-proxy](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-permissive-trust-proxy?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                     | CWE-348  | A05:2021 |      | This rule detects unconditional 'trust proxy' settings, which make req.ip whatever the caller says it is an… | 🟢  | 💼  |     |     |     |     |
| [no-sensitive-data-in-query](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-sensitive-data-in-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                   | CWE-598  | A04:2021 |      | Disallow reading sensitive-named parameters (password, token, secret, apiKey, ...) from req.query.           | 🟢  |     | ⚠️  |     |     |     |
| [no-static-root-exposure](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-static-root-exposure?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                         | CWE-548  | A05:2021 |      | Disallow express.static() roots that expose the application directory and any serve-index usage              | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-csp-directives](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-unsafe-csp-directives?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                       |  CWE-79  | A03:2021 |      | This rule detects Content-Security-Policy directives that hand back the protection the header exists to pro… | 🟢  | 💼  |     |     |     |     |
| [no-user-controlled-redirect](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-user-controlled-redirect?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                 | CWE-601  |          |      | Disallow res.redirect() with values directly from req.query / req.body / req.params                          | 🟢  | 💼  |     |     |     |     |
| [no-user-controlled-render-locals](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-user-controlled-render-locals?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)       |  CWE-73  | A03:2021 |      | Disallow res.render() with locals or view names sourced wholesale from req.body / req.query / req.params     | 🟢  | 💼  |     |     |     |     |
| [require-case-insensitive-path-guard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-case-insensitive-path-guard?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security) | CWE-178  | A01:2021 |      | This rule detects path-based authorization guards that compare req.path case-sensitively, which case-insens… | 🟢  |     | ⚠️  |     |     |     |
| [require-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-csrf-protection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                         | CWE-352  |          |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  |     | ⚠️  |     |     |     |
| [require-express-body-parser-limits](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-express-body-parser-limits?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)   | CWE-400  |          |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  |     | ⚠️  |     |     |     |
| [require-helmet](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-helmet?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                                           | CWE-693  |          |      | This rule detects Express.js applications that are missing the helmet middleware                             | 🟢  | 💼  |     |     |     |     |
| [require-query-type-guard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-query-type-guard?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                       | CWE-843  | A03:2021 |      | This rule detects string methods called on req.query values without a type guard — Express query values can… | 🟢  |     | ⚠️  |     |     |     |
| [require-rate-limiting](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-rate-limiting?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)                             | CWE-770  |          |      | This rule detects Express.js applications missing rate-limiting middleware                                   | 🟢  | 💼  |     |     |     |     |
| [require-route-authentication](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-route-authentication?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)               | CWE-306  | A07:2021 |      | This rule detects routes that expose a critical function — credentials, accounts, payments, configuration —… | 🟢  |     | ⚠️  |     |     |     |
| [require-strict-transport-security](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-strict-transport-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security)     | CWE-319  | A02:2021 |      | This rule detects HSTS configurations that leave a downgrade window open — the header disabled, a max-age b… | 🟢  | 💼  |     |     |     |     |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin                                                                                                 |                                                                               Downloads                                                                                | Description                   |
| :----------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security)   |  [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security)  | Anthropic SDK security.       |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)    | XSS, DOM security.            |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-drizzle-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-drizzle-security)    | Drizzle security.             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)    | Express middleware hardening. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security)     | Google Gemini SDK security.   |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt-security)        | Token security.               |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security)             |       [![downloads](https://img.shields.io/npm/dt/eslint-plugin-knex-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-knex-security)       | Knex security.                |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)     | AWS Lambda hardening.         |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security)    | MCP SDK security.             |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)    | MongoDB injection.            |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mysql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mysql-security)      | MySQL security.               |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)     | NestJS framework hardening.   |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security)             |       [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security)       | Server-side patterns.         |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security)     | OpenAI SDK security.          |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-postgresql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | PostgreSQL security.          |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-prisma-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prisma-security)     | Prisma security.              |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)             |       [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)       | Injection prevention.         |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security)   |  [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security)  | Sequelize ORM security.       |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security)     | SQLite security.              |
| [`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-supabase-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-supabase-security)   | Supabase security.            |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security)    | TypeORM security.             |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)   |  [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)  | AI SDK security.              |

**Code quality**

| Plugin                                                                                         |                                                                           Downloads                                                                            | Description                               |
| :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-conventions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-conventions)     | Team-specific habits and styles.          |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)     | Fast cycle + import-graph analysis.       |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns.   |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization)   | ESNext migration + syntax evolution.      |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity)      | Structural integrity and DDD patterns.    |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability)     | Production readiness and resource health. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y)      | React accessibility / WCAG.               |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features)   |  [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features)  | React best practices and optimization.    |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability)     | Runtime stability and error safety.       |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security"><img src="https://eslint.interlace.tools/images/og-express-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-express-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
