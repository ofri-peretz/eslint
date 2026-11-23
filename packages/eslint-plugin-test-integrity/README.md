<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-test-integrity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  The ways a test suite is made to pass without the code passing — a focused test, an unexplained skip, a fixed sleep, a retry — as lint rules.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-test-integrity" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-test-integrity.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-test-integrity" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-test-integrity.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-test-integrity" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-test-integrity" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-test-integrity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity). 📚

<!-- AUTO-GENERATED:INSTALL:START - Do not edit manually -->

```bash
npm install --save-dev eslint eslint-plugin-test-integrity
```

```js
// eslint.config.mjs
import { configs } from 'eslint-plugin-test-integrity';

export default [configs.recommended];
```

`recommended` is the preset to start with. The others are listed under Configuration Presets below.

Using oxlint or Vite+? Install `oxlint-plugin-test-integrity`: the same rules under the same `test-integrity/<rule>` IDs, without ESLint. Its [page](https://www.npmjs.com/package/oxlint-plugin-test-integrity) has the setup.

<!-- AUTO-GENERATED:INSTALL:END -->

## Description

Test integrity — no `.only`, no unexplained `.skip`, no fixed sleeps, no retries in tests.

"Do not skip flaky tests, add sleeps, or retry until they pass" is a line every coding agent is told in prose. Prose is forgotten under pressure; a lint rule is not. Each rule here reports one of the ways a red suite is turned green without the code under test changing, and each message names the fix.

| Rule                  | Reports                                                                                          |
| :-------------------- | :----------------------------------------------------------------------------------------------- |
| `no-focused-test`     | `.only` on `it` / `test` / `describe` / `bench`, and `fit` / `fdescribe`                         |
| `no-unexplained-skip` | `.skip`, `.todo`, `.fixme`, `xit`, constant `skipIf` / `runIf` — unless a comment explains it    |
| `no-fixed-sleep`      | `new Promise((r) => setTimeout(r, n))`, `await sleep(n)`, `page.waitForTimeout(n)`, `cy.wait(n)` |
| `no-test-retry`       | `retry` / `retries` in test options and runner configs, `jest.retryTimes`, `this.retries`        |

**Scope:** a call counts as a test only when its root (`it`, `test`, `describe`, …) is an unbound global or is imported from a test runner (`vitest`, `@jest/globals`, `@playwright/test`, `node:test`, `bun:test`, `mocha`). A local function called `it`, or a query builder's `.only()`, is never reported. `no-fixed-sleep` reads test files only.

**Explaining a skip or a retry:** a comment on the same line or the line above with an issue URL or a decision id (`D-107`) makes it legal. A skip may also carry a `YYYY-MM-DD` date — it is legal until that date passes, then it reports again.

**What it does not do:** decide whether a skip is justified. It asks that the reason be written down where the next reader will find it.

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

## ⚙️ Configuration Presets

| Preset        | Description                                                                                     |
| :------------ | :---------------------------------------------------------------------------------------------- |
| `recommended` | Every rule, as an error.                                                                        |
| `adoption`    | Every rule, as a warning — for a codebase turning the rules on, before moving to `recommended`. |

## Usage

```js
// eslint.config.js
import testIntegrity from 'eslint-plugin-test-integrity';

export default [
  {
    files: [
      '**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/{vitest,jest,playwright}.config.*',
    ],
    ...testIntegrity.configs.recommended,
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-test-integrity/oxlint"] }
```

## Diff checks

Two checks are about what a change did, not what a file says, so they cannot be lint rules. They ship as the `test-integrity-diff` bin and read only the changed lines between a base ref and `HEAD`:

- **weakened-assertion** — an `expect(subject)` whose matcher moved down the strictness order in the same change: `toBe` / `toStrictEqual` > `toEqual` > `toMatchObject` > `toBeTruthy` / `toBeDefined`. An `Assertion: <why>` line in a commit message of the range accepts it.
- **unexplained-snapshot** — a changed `.snap` file with no `Snapshot: <reason>` line in any commit message of the range.

```yaml
# lefthook.yml
pre-push:
  commands:
    test-integrity:
      run: npx test-integrity-diff --base origin/main
```

Exit code 1 means a finding was printed as `path:line check message`; 2 means git could not compare against the base.

## 📦 Compatibility

| Package | Version                                                                                                   |
| :------ | :-------------------------------------------------------------------------------------------------------- |
| ESLint  | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/)       |

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

| Rule                                                                                                                                                                                               | CWE | OWASP | CVSS | Description                                                                                   | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | :---: | :--: | :-------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-fixed-sleep](https://eslint.interlace.tools/docs/quality/plugin-test-integrity/rules/no-fixed-sleep?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity)           |     |       |      | Disallow fixed-duration sleeps in tests; await the event or condition instead                 | 🟢  |     |     |     |     |     |
| [no-focused-test](https://eslint.interlace.tools/docs/quality/plugin-test-integrity/rules/no-focused-test?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity)         |     |       |      | Disallow focused tests (.only, fit, fdescribe) that silently turn the rest of the suite off   | 🟢  |     |     |     |     |     |
| [no-test-retry](https://eslint.interlace.tools/docs/quality/plugin-test-integrity/rules/no-test-retry?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity)             |     |       |      | Disallow test retries unless a comment cites the decision or issue that allows them           | 🟢  |     |     |     |     |     |
| [no-unexplained-skip](https://eslint.interlace.tools/docs/quality/plugin-test-integrity/rules/no-unexplained-skip?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity) |     |       |      | Require every skipped or todo test to carry an issue link, a decision id or an unexpired date | 🟢  |     |     |     |     |     |

<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- INTERLACE:STAR_CTA:START -->

## Support

Found a false positive? [Open an issue](https://github.com/ofri-peretz/eslint/issues): that is a bug. If the plugin helped, a star on [ofri-peretz/eslint](https://github.com/ofri-peretz/eslint) helps others find it.

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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-test-integrity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity"><img src="https://eslint.interlace.tools/images/og-test-integrity.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-test-integrity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-test-integrity" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
