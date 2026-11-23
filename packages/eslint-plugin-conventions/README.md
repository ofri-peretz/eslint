<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Project conventions: naming, file structure, and code style consistency.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-conventions.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-conventions.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-conventions" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-conventions" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-conventions" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-conventions" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions). 📚

<!-- AUTO-GENERATED:INSTALL:START - Do not edit manually -->

```bash
npm install --save-dev eslint eslint-plugin-conventions
```

```js
// eslint.config.mjs
import { configs } from 'eslint-plugin-conventions';

export default [configs.recommended];
```

`recommended` is the preset to start with. The others are listed under Configuration Presets below.

Using oxlint or Vite+? Install `oxlint-plugin-conventions`: the same rules under the same `conventions/<rule>` IDs, without ESLint. Its [page](https://www.npmjs.com/package/oxlint-plugin-conventions) has the setup.

<!-- AUTO-GENERATED:INSTALL:END -->

## Description

This plugin provides Project conventions: naming, file structure, and code style consistency.

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

| Preset        | Description                                                                                                                                                                                                                  |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recommended` | Balanced conventions for most teams                                                                                                                                                                                          |
| `guidance`    | Agent guidance files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, skills, subagents): size budgets, rules held only by prose, procedures in always-loaded files, subagent model and tools, duplicated lines. Markdown, at `warn`. |

---

## 🏢 Usage Example

```js
// eslint.config.js
import conventions from 'eslint-plugin-conventions';

export default [conventions.configs.recommended];
```

### Agent guidance files

The `guidance` preset lints agent guidance as Markdown. It needs
[`@eslint/markdown`](https://github.com/eslint/markdown) registered as the `markdown` plugin:

```js
// eslint.config.js
import markdown from '@eslint/markdown';
import { configs } from 'eslint-plugin-conventions';

export default [{ plugins: { markdown } }, configs.guidance];
```

Each rule asks a question a parser can answer — is this file over its ratcheted budget, does this
`never`/`always` line name something a tool could check without linking the tool that does, is a
long procedure in a file read on every session — and leaves the judgment to a person.

---

## 📦 Compatibility

| Package | Version                            |
| :------ | :--------------------------------- |
| ESLint  | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=22.13.0`                        |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

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

| Rule                                                                                                                                                                                                                       |   CWE    | OWASP | CVSS | Description                                                                                                    | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :------------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [analytics-event-naming](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/analytics-event-naming?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                         |          |       |      | Analytics event names (track/capture) must follow ANALYTICS_PHILOSOPHY.md principle 4: lowercase snake_case…   | 🟢  | 💼  |     |     |     |     |
| [consistent-existence-index-check](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/consistent-existence-index-check?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)     |          |       |      | Enforce one form for checking whether an object has a property                                                 | 🟢  |     |     |     | 💡  |     |
| [enforced-rule-in-prose](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/enforced-rule-in-prose?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                         |          |       |      | Report never/always lines in agent guidance that a tool could enforce, unlinked to the tool that does          | 🟢  |     |     |     |     |     |
| [expiring-todo-comments](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/expiring-todo-comments?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                         |          |       |      | Add expiration conditions to TODO comments to prevent forgotten tasks. This rule is part of eslint-plugin-c…   | 🟢  |     | ⚠️  |     | 💡  |     |
| [filename-case](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/filename-case?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                           |          |       |      | Enforce filename case conventions for consistency across your codebase                                         | 🟢  |     |     |     | 💡  |     |
| [guidance-budget](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/guidance-budget?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                       |          |       |      | Keep always-loaded agent guidance (CLAUDE.md, AGENTS.md) and skills inside a ratcheted size budget             | 🟢  |     |     |     |     |     |
| [no-commented-code](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-commented-code?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                   |          |       |      | Disallow commented-out code: delete it and let version control keep the history.                               | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-console-spaces](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-console-spaces?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                   |          |       |      | Disallow leading/trailing whitespace in console arguments. This rule is part of eslint-plugin-conventions.     | 🟢  |     |     |     |     |     |
| [no-deprecated-api](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-deprecated-api?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                   | CWE-1078 |       |      | Prevent usage of deprecated APIs with migration context and timeline. This rule is part of eslint-plugin-co…   | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-duplicated-guidance](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-duplicated-guidance?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                         |          |       |      | Disallow the same guidance line in two always-loaded agent files (CLAUDE.md, AGENTS.md, GEMINI.md) of one repo | 🟢  |     |     |     |     |     |
| [no-json-schema-tags](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-json-schema-tags?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                               |          |       |      | Disallow JSON Schema keywords (e.g. @minimum, @maximum, @pattern, @format) used as JSDoc tags.                 | 🟢  |     |     |     | 💡  |     |
| [no-magic-numbers](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-magic-numbers?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                     |          |       |      | Disallow magic numbers (numeric literals without a named constant)                                             | 🟢  |     |     |     | 💡  |     |
| [no-raw-cross-property-href](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-raw-cross-property-href?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                 |          |       |      | Forbid hand-written cross-property hrefs; use buildUtmHref() from lib/utm.ts                                   | 🟢  | 💼  |     |     |     |     |
| [prefer-code-point](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-code-point?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                   |          |       |      | Prefer String.codePointAt() over String.charCodeAt(). This rule is part of eslint-plugin-conventions.          | 🟢  |     |     |     |     |     |
| [prefer-dependency-version-strategy](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dependency-version-strategy?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |          |       |      | Enforce consistent version strategy (caret ^, tilde ~, exact, range, or any) for package.json dependencies.…   | 🟢  |     |     |     | 💡  |     |
| [prefer-dom-node-text-content](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dom-node-text-content?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)             |          |       |      | Prefer textContent over innerText. This rule is part of eslint-plugin-conventions.                             | 🟢  |     |     |     | 💡  |     |
| [procedure-in-memory](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/procedure-in-memory?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                               |          |       |      | Disallow long numbered procedures in always-loaded agent guidance; move them to a skill                        | 🟢  |     |     |     |     |     |
| [require-data-testid](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/require-data-testid?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                               |          |       |      | Require stable data-testid attributes on interactive elements for end-to-end test reliability                  | 🟢  |     |     |     | 💡  |     |
| [subagent-declares-model](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/subagent-declares-model?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                       |          |       |      | Require every .claude/agents/*.md subagent to declare a model and a tool allowlist in its frontmatter          | 🟢  |     |     |     |     |     |
| [utm-taxonomy](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/utm-taxonomy?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)                                             |          |       |      | Validate utm_source and utm_medium values against the fixed taxonomy in UTM_PHILOSOPHY.md                      | 🟢  | 💼  |     |     |     |     |

<!-- AUTO-GENERATED:RULES_TABLE:END -->
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
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)     | Fast cycle + import-graph analysis.       |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns.   |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization)   | ESNext migration + syntax evolution.      |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity)      | Structural integrity and DDD patterns.    |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability)     | Production readiness and resource health. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y)      | React accessibility / WCAG.               |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features)   |  [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features)  | React best practices and optimization.    |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability)     | Runtime stability and error safety.       |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

<!-- INTERLACE:STAR_CTA:START -->

## Support

Found a false positive? [Open an issue](https://github.com/ofri-peretz/eslint/issues): that is a bug. If the plugin helped, a star on [ofri-peretz/eslint](https://github.com/ofri-peretz/eslint) helps others find it.

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions"><img src="https://eslint.interlace.tools/images/og-conventions.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
