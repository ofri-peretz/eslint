<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-cli-floor?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  The CLI floor for <a href="https://www.npmjs.com/package/commander">commander</a>, <a href="https://www.npmjs.com/package/yargs">yargs</a> and <a href="https://www.npmjs.com/package/burgee">burgee</a> programs — held in the source.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-cli-floor" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-cli-floor.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-cli-floor" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-cli-floor.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-cli-floor" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-cli-floor" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

The CLI floor — commander, yargs and burgee commands with descriptions, one-line examples, no console, and a flag behind every prompt.

It is the lint half of [burgee](https://github.com/ofri-peretz/burgee)'s CLI floor: the requirements whose stated behaviour is a property of a program's **source**, which a runtime cannot hold for a program that never adopted it. They apply to any CLI built on commander or yargs — burgee or not.

| burgee requirement | What it asks                                                     | Rule                          |
| :----------------- | :--------------------------------------------------------------- | :---------------------------- |
| F3                 | every command declares a description                             | `require-command-description` |
| F3, H2             | every command declares an example, and every example is one line | `require-command-example`     |
| O3                 | command code writes through the output layer, never `console.*`  | `no-console-in-command`       |
| P1                 | every prompt is backed by a flag; a flag value skips the prompt  | `no-prompt-without-flag`      |

**Scope:** every rule reads a command only when its host is **proven by import** — the receiver of `.command()` resolves, through ESLint's scope analysis, to commander's `Command` / `program` / `createCommand`, to a `yargs()` instance, to a parameter typed `Command` or `Argv` from those modules, or to the object given to burgee's `defineCommand`. `.command()`, `.action()` and `.example()` are ordinary method names that routers, job queues and ORMs own too; none of them is ever reported.

**What it does not do:** follow a handler or a prompt into a helper defined elsewhere, or read a command declared in another file. Where the source cannot be read — a spread, a description in a variable, a command module imported by path — the rule abstains.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

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

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-cli-floor?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor). 📚

```bash
npm install eslint-plugin-cli-floor --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                                                                                    |
| :------------ | :------------------------------------------------------------------------------------------------------------- |
| `recommended` | Description, example and `console` — the three rules whose evidence is a declaration.                          |
| `strict`      | Every rule, including `no-prompt-without-flag`, which waits here until its precision is measured on real CLIs. |

## Usage

```js
// eslint.config.js
import cliFloor from 'eslint-plugin-cli-floor';

export default [cliFloor.configs.recommended];
```

Or wire the rules yourself:

```js
import cliFloor from 'eslint-plugin-cli-floor';

export default [
  {
    plugins: { 'cli-floor': cliFloor },
    rules: {
      'cli-floor/no-console-in-command': 'error',
    },
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-cli-floor/oxlint"] }
```

## 📦 Compatibility

| Package   | Version                                                                                                         |
| :-------- | :-------------------------------------------------------------------------------------------------------------- |
| commander | [![npm](https://img.shields.io/npm/v/commander.svg?style=flat-square)](https://www.npmjs.com/package/commander) |
| yargs     | [![npm](https://img.shields.io/npm/v/yargs.svg?style=flat-square)](https://www.npmjs.com/package/yargs)         |
| burgee    | [![npm](https://img.shields.io/npm/v/burgee.svg?style=flat-square)](https://www.npmjs.com/package/burgee)       |
| ESLint    | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint)       |
| Node.js   | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/)             |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

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

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->

| Rule                                                                                                                                                                                                     | CWE | OWASP | CVSS | Description                                                                                     | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | :---: | :--: | :---------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-console-in-command](https://eslint.interlace.tools/docs/quality/plugin-cli-floor/rules/no-console-in-command?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor)             |     |       |      | Disallow console.* inside a CLI command handler; write through the output layer                 | 🟢  |     |     |     |     |     |
| [no-prompt-without-flag](https://eslint.interlace.tools/docs/quality/plugin-cli-floor/rules/no-prompt-without-flag?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor)           |     |       |      | Require every interactive prompt in a CLI command to be skippable with a flag                   | 🟢  |     |     |     |     |     |
| [require-command-description](https://eslint.interlace.tools/docs/quality/plugin-cli-floor/rules/require-command-description?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor) |     |       |      | Require every CLI command to declare a description                                              | 🟢  |     |     |     |     |     |
| [require-command-example](https://eslint.interlace.tools/docs/quality/plugin-cli-floor/rules/require-command-example?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor)         |     |       |      | Require every runnable CLI command to declare an example, and every example to be a single line | 🟢  |     |     |     |     |     |

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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-cli-floor?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor"><img src="https://eslint.interlace.tools/images/og-cli-floor.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-cli-floor?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-cli-floor" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
