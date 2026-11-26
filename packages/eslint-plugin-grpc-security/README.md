<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-grpc-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for Node gRPC servers built on <a href="https://www.npmjs.com/package/@grpc/grpc-js">@grpc/grpc-js</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-grpc-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-grpc-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-grpc-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-grpc-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-grpc-security" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-grpc-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-grpc-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security). 📚

<!-- AUTO-GENERATED:INSTALL:START - Do not edit manually -->

```bash
npm install --save-dev eslint eslint-plugin-grpc-security
```

```js
// eslint.config.mjs
import { configs } from 'eslint-plugin-grpc-security';

export default [configs.recommended];
```

`recommended` is the preset to start with. The others are listed under Configuration Presets below.

Using oxlint or Vite+? Install `oxlint-plugin-grpc-security`: the same rules under the same `grpc-security/<rule>` IDs, without ESLint. Its [page](https://www.npmjs.com/package/oxlint-plugin-grpc-security) has the setup.

<!-- AUTO-GENERATED:INSTALL:END -->

## Description

Security rules for Node gRPC servers (unguarded server reflection, caller identity read from metadata, unbounded message sizes, caught errors sent to the client).

They target servers built on [@grpc/grpc-js](https://www.npmjs.com/package/@grpc/grpc-js).

**Scope:** every rule gates on gRPC structure, never on a method name alone. `no-unguarded-reflection` needs a reflection package imported and the call resolved to it. `no-identity-from-metadata` needs a gRPC handler: a method of the object passed to `.addService(service, implementation)` whose first parameter's `metadata` is read. Servers often load `@grpc/grpc-js` through a wrapper module, so this rule does not require the import itself.

The first rule is `no-unguarded-reflection`. Server reflection answers "which services does this listener serve?" to any client, unauthenticated. Registered unconditionally it ships to production, and `grpcurl -plaintext host:port list` then names every service on the server, the internal ones included. The rule reports a registration with no branch between it and the program running, and stays silent once any branch decides it (`if (process.env.NODE_ENV !== 'production')`, a config flag, an early return).

`no-identity-from-metadata` catches the backend that believes a header a gateway was supposed to set. A value read from a handler's `call.metadata` that reaches an equality check against a per-request record (`acc.owner !== user`) is the caller's identity, and any client can send it. Resolving the header through a server-side lookup or a verifier ends the flow, so the rule stays silent on a verified token.

`no-unbounded-message-size` reports `grpc.max_receive_message_length` / `grpc.max_send_message_length` set to `-1` or above 100 MiB, evaluated from literals, arithmetic and consts. `no-error-detail-leak` reports a status sent through a handler's callback or call object whose `details` are built from a caught error's stack or message.

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

| Preset        | Description                |
| :------------ | :------------------------- |
| `minimal`     | `no-unguarded-reflection`. |
| `recommended` | Every rule.                |
| `strict`      | Every rule.                |

## Usage

```js
// eslint.config.js
import grpcSecurity from 'eslint-plugin-grpc-security';

export default [grpcSecurity.configs.recommended];
```

Or wire the rules yourself:

```js
import grpcSecurity from 'eslint-plugin-grpc-security';

export default [
  {
    plugins: { 'grpc-security': grpcSecurity },
    rules: {
      'grpc-security/no-unguarded-reflection': 'error',
    },
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-grpc-security/oxlint"] }
```

## 📦 Compatibility

| Package            | Version                                                                                                                       |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `@grpc/reflection` | [![npm](https://img.shields.io/npm/v/@grpc/reflection.svg?style=flat-square)](https://www.npmjs.com/package/@grpc/reflection) |
| ESLint             | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint)                     |
| Node.js            | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/)                           |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

### Supported library versions

The library ranges the rules were written against. Documentation only: this package installs and requires none of them.

- `@grpc/reflection`: `^1.0.0`
- `grpc-server-reflection`: `^0.1.0`

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

| Rule                                                                                                                                                                                                          |   CWE   |  OWASP   | CVSS | Description                                                      | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-----: | :------: | :--: | :--------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-error-detail-leak](https://eslint.interlace.tools/docs/security/plugin-grpc-security/rules/no-error-detail-leak?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security)           | CWE-209 | A05:2021 |      | Do not send a caught error's stack or message to the gRPC client | 🟢  |     |     |     |     |     |
| [no-identity-from-metadata](https://eslint.interlace.tools/docs/security/plugin-grpc-security/rules/no-identity-from-metadata?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security) | CWE-290 | A07:2021 |      | Do not authorize a gRPC caller by an identity read from metadata | 🟢  |     |     |     |     |     |
| [no-unbounded-message-size](https://eslint.interlace.tools/docs/security/plugin-grpc-security/rules/no-unbounded-message-size?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security) | CWE-770 | A04:2021 |      | Keep gRPC message size limits bounded                            | 🟢  |     |     |     |     |     |
| [no-unguarded-reflection](https://eslint.interlace.tools/docs/security/plugin-grpc-security/rules/no-unguarded-reflection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security)     | CWE-306 | A05:2021 |      | Register gRPC server reflection only behind a guard              | 🟢  |     |     |     |     |     |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-grpc-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security"><img src="https://eslint.interlace.tools/images/og-grpc-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-grpc-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-grpc-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
