<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://modelcontextprotocol.io" target="_blank"><img src="https://eslint.interlace.tools/logos/mcp.svg" alt="Model Context Protocol" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for <a href="https://www.npmjs.com/package/@modelcontextprotocol/sdk">@modelcontextprotocol/sdk</a> — the Model Context Protocol SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mcp-sdk-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mcp-sdk-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-mcp-sdk-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for code built on [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk).

**Scope:** this plugin lints the MCP **SDK's API shapes** — `registerTool`, transports, handler signatures. It does not inspect MCP wire traffic, which isn't visible from source. Every rule gates on the SDK actually being imported, so it stays silent in files that don't use MCP.

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

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security). 📚

<!-- AUTO-GENERATED:INSTALL:START - Do not edit manually -->

**oxlint / Vite+** — the same rules under the same `mcp-sdk-security/<rule>` IDs, without ESLint:

```bash
npm install oxlint-plugin-mcp-sdk-security --save-dev
```

```jsonc
// .oxlintrc.json
{ "jsPlugins": ["oxlint-plugin-mcp-sdk-security"] }
```

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({ lint: { jsPlugins: ['oxlint-plugin-mcp-sdk-security'] } });
```

**ESLint:**

```bash
npm install eslint-plugin-mcp-sdk-security --save-dev
```

<!-- AUTO-GENERATED:INSTALL:END -->

## ⚙️ Configuration Presets

| Preset | Rules (`error`, except `no-duplicate-tool-name` at `warn`) | Description |
| :--- | :--- | :--- |
| `minimal` | `no-command-injection-in-tool`, `require-tool-input-schema` | Only the rules whose every finding is a defect by construction. |
| `recommended` | `no-code-injection-in-tool`, `no-command-injection-in-tool`, `no-credential-leak-in-tool`, `no-duplicate-tool-name`, `no-path-traversal-in-tool`, `no-predictable-session-id`, `no-shared-stateless-transport`, `no-sql-injection-in-tool`, `no-ssrf-in-tool`, `no-tool-description-injection`, `no-untrusted-stdio-command`, `no-untrusted-tool-metadata-in-prompt`, `no-unvalidated-tool-args`, `require-http-transport-hardening`, `require-tool-input-schema` | The default. Every rule, each at `error` from CVSS 7.0 up and `warn` below. |
| `strict` | `no-code-injection-in-tool`, `no-command-injection-in-tool`, `no-credential-leak-in-tool`, `no-duplicate-tool-name`, `no-path-traversal-in-tool`, `no-predictable-session-id`, `no-shared-stateless-transport`, `no-sql-injection-in-tool`, `no-ssrf-in-tool`, `no-tool-description-injection`, `no-untrusted-stdio-command`, `no-untrusted-tool-metadata-in-prompt`, `no-unvalidated-tool-args`, `require-http-transport-hardening`, `require-tool-input-schema` | Every rule, at its `recommended` level. Where a new rule lands before its false-positive profile is measured. |

Supported servers: `@modelcontextprotocol/sdk` (v1), the v2 split packages
(`@modelcontextprotocol/server`, `client`, `core`, `node`, `express`, `hono`,
`fastify`), and `mcp-handler` / `@vercel/mcp-adapter`. Every rule stays silent
in a file that imports none of them.

What the rules cover:

- **Tool handlers** — a tool argument, `request.params.arguments` or a
  `ResourceTemplate` variable reaching a process (`no-command-injection-in-tool`),
  a file path (`no-path-traversal-in-tool`), a request host (`no-ssrf-in-tool`),
  SQL text (`no-sql-injection-in-tool`) or `eval` / `vm`
  (`no-code-injection-in-tool`); the environment or the caller's token in a
  result, or that token forwarded upstream (`no-credential-leak-in-tool`); the
  schema/handler contract (`require-tool-input-schema`,
  `no-unvalidated-tool-args`); one name registered twice
  (`no-duplicate-tool-name`).
- **Model-facing text** — a tool, prompt or resource description built from
  text a client, a remote service or a file controls
  (`no-tool-description-injection`).
- **HTTP transports** — DNS-rebinding protection, `allowedHosts` and
  authentication (`require-http-transport-hardening`), a stateless transport
  or server shared across requests (`no-shared-stateless-transport`,
  CVE-2026-25536), and predictable session IDs (`no-predictable-session-id`).
- **Clients** — a server's tool metadata written into an LLM prompt
  (`no-untrusted-tool-metadata-in-prompt`), and a stdio server command taken
  from a tool argument, a network response or project config
  (`no-untrusted-stdio-command`).

Each taint rule follows the value inside its handler — used directly, built
into a string, or derived — and resolves sinks to the module that defines them.
Tool handlers are this plugin's scope, so on the same line it may report
alongside [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security)
(`no-shell-injection`, `detect-non-literal-fs-filename`, `no-ssrf`,
`detect-eval-with-expression`) or
[`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)
(`no-sql-injection`), which cover the same sinks outside MCP handlers. Each
rule's doc states its overlap.

## Usage

```js
// eslint.config.js
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  mcpSdkSecurity.configs.recommended,
];
```

Or wire the rules yourself:

```js
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  {
    plugins: { 'mcp-sdk-security': mcpSdkSecurity },
    rules: {
      'mcp-sdk-security/require-tool-input-schema': 'error',
    },
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-mcp-sdk-security/oxlint"] }
```

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| `@modelcontextprotocol/sdk` | [![npm](https://img.shields.io/npm/v/@modelcontextprotocol/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@modelcontextprotocol/sdk) |
| ESLint | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/) |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

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
| [no-code-injection-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-code-injection-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-95 | A03:2021 |  | Disallow an MCP tool argument reaching eval, new Function or a vm context as code. | 🟢 | 💼 |  |  |  |  |
| [no-command-injection-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-command-injection-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-78 | A03:2021 |  | Disallow an MCP tool argument choosing the command a child_process call runs. | 🟢 | 💼 |  |  |  |  |
| [no-credential-leak-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-credential-leak-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-200 | A01:2021 |  | Disallow an MCP tool returning the server's environment or the caller's token, or forwarding that token ups… | 🟢 | 💼 |  |  |  |  |
| [no-duplicate-tool-name](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-duplicate-tool-name?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-694 | A04:2021 |  | Disallow registering or listing two MCP tools with the same name on one server. | 🟢 |  | ⚠️ |  |  |  |
| [no-path-traversal-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-path-traversal-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-22 | A01:2021 |  | Disallow an MCP tool argument choosing the file an fs call reads, writes or deletes without a containment c… | 🟢 | 💼 |  |  |  |  |
| [no-predictable-session-id](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-predictable-session-id?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-330 | A02:2021 |  | Disallow an MCP sessionIdGenerator that returns a counter, a timestamp, Math.random() or a constant. | 🟢 | 💼 |  |  |  |  |
| [no-shared-stateless-transport](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-shared-stateless-transport?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-488 | A04:2021 |  | Disallow sharing one stateless Streamable HTTP transport or one MCP server across requests. | 🟢 | 💼 |  |  |  |  |
| [no-sql-injection-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-sql-injection-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-89 | A03:2021 |  | Disallow an MCP tool argument reaching the text of a SQL query instead of its parameters. | 🟢 | 💼 |  |  |  |  |
| [no-ssrf-in-tool](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-ssrf-in-tool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-918 | A10:2021 |  | Disallow an MCP tool argument choosing the host an outbound HTTP request is sent to. | 🟢 | 💼 |  |  |  |  |
| [no-tool-description-injection](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-tool-description-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-1427 | A03:2021 |  | Disallow MCP tool, prompt and resource descriptions built from text a client, a remote service or a file co… | 🟢 | 💼 |  |  |  |  |
| [no-untrusted-stdio-command](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-untrusted-stdio-command?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-78 | A03:2021 |  | Disallow an MCP client spawning a stdio server whose command comes from a tool argument, a network response… | 🟢 | 💼 |  |  |  |  |
| [no-untrusted-tool-metadata-in-prompt](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-untrusted-tool-metadata-in-prompt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-1427 | A03:2021 |  | Disallow an MCP client writing a server's tool, prompt or resource metadata into an LLM prompt instead of i… | 🟢 | 💼 |  |  |  |  |
| [no-unvalidated-tool-args](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/no-unvalidated-tool-args?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-20 | A03:2021 |  | Disallow a tool handler reading an argument its declared input schema does not include. | 🟢 | 💼 |  |  |  |  |
| [require-http-transport-hardening](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/require-http-transport-hardening?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-346 | A05:2021 |  | Require an MCP HTTP server transport to validate the Host header and a network-reachable MCP server to auth… | 🟢 | 💼 |  |  |  |  |
| [require-tool-input-schema](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security/rules/require-tool-input-schema?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) | CWE-20 | A03:2021 |  | Require an input schema when an MCP tool handler reads arguments. | 🟢 | 💼 |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

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
| [`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-supabase-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-supabase-security) | Supabase security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | AI SDK security. |

**Code quality**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-cli-floor`](https://www.npmjs.com/package/eslint-plugin-cli-floor) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-cli-floor.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-cli-floor) | CLI floor for commander, yargs and burgee. |
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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security"><img src="https://eslint.interlace.tools/images/og-mcp-sdk-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
