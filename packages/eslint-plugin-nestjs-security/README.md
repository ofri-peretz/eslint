<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://nestjs.com" target="_blank"><img src="https://eslint.interlace.tools/logos/nestjs.svg" alt="NestJS" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications (Controllers, Providers, Decorators).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-nestjs-security" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-nestjs-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-nestjs-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-nestjs-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules tailored for NestJS applications (Controllers, Providers, Decorators).

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

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security). 📚

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                              |
| :------------ | :------------------------------------------------------- |
| `recommended` | Enables all security rules with sensible severity levels |
| `strict`      | All security rules set to 'error' for maximum protection |

## 📚 Supported Libraries

| Library             | npm                                                                                                                             | Downloads                                                                                                                              | Detection          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `@nestjs/common`    | [![npm](https://img.shields.io/npm/v/@nestjs/common.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/common)       | [![downloads](https://img.shields.io/npm/dt/@nestjs/common.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/common)       | Decorators, Guards |
| `@nestjs/core`      | [![npm](https://img.shields.io/npm/v/@nestjs/core.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/core)           | [![downloads](https://img.shields.io/npm/dt/@nestjs/core.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/core)           | App Config         |
| `class-validator`   | [![npm](https://img.shields.io/npm/v/class-validator.svg?style=flat-square)](https://www.npmjs.com/package/class-validator)     | [![downloads](https://img.shields.io/npm/dt/class-validator.svg?style=flat-square)](https://www.npmjs.com/package/class-validator)     | DTO Validation     |
| `@nestjs/throttler` | [![npm](https://img.shields.io/npm/v/@nestjs/throttler.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/throttler) | [![downloads](https://img.shields.io/npm/dt/@nestjs/throttler.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/throttler) | Rate Limiting      |

---

## ⚠️ Global Configuration Handling

NestJS applies guards, pipes and rate limiting **application-wide**, in a file the
controller never imports. Since v1.3.0 the plugin discovers those registrations
itself: on the first finding it locates the project root (nearest `package.json`)
and scans the bootstrap and `*.module.ts` files once, caching the result.

| Approach             | Example                                                | Detected? |
| -------------------- | ------------------------------------------------------ | :-------: |
| **Per-Controller**   | `@UseGuards(AuthGuard)` on class                       |    ✅     |
| **Per-Method**       | `@UseGuards(AuthGuard)` on method                      |    ✅     |
| **Composite**        | `@AuthJwtAccessProtected()` wrapping `UseGuards`       |    ✅¹    |
| **Global (main.ts)** | `app.useGlobalGuards()` / `app.useGlobalPipes()`       |    ✅     |
| **Global (Module)**  | `{ provide: APP_GUARD, useClass: AuthGuard }`          |    ✅     |
| **Global (Module)**  | `{ provide: APP_PIPE, useClass: ValidationPipe }`      |    ✅     |
| **Global (Module)**  | `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` |    ✅     |

¹ A composite decorator cannot be resolved by a syntax-only linter, so any route
carrying a decorator the plugin does not recognise is assumed to be protected. A
missed finding is cheaper than a false positive on somebody else's codebase. Set
`allowCustomDecorators: false` on `require-guards` if you want the strict
behaviour back.

`ThrottlerGuard` registered as `APP_GUARD` counts as rate limiting, **not** as
authentication — a project that only throttles still gets `require-guards`
findings.

### Escape hatch: `assumeGlobal*` and `detectGlobal*` options

`assumeGlobal*: true` disables a rule outright without scanning the project;
`detectGlobal*: false` disables the project scan and restores strict per-file
checking:

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  {
    ...nestjsSecurity.configs.recommended,
    rules: {
      // Tell ESLint: "We have app.useGlobalGuards() in main.ts"
      'nestjs-security/require-guards': ['warn', { assumeGlobalGuards: true }],

      // Tell ESLint: "We have app.useGlobalPipes(new ValidationPipe()) in main.ts"
      'nestjs-security/no-missing-validation-pipe': [
        'warn',
        { assumeGlobalPipes: true },
      ],

      // Tell ESLint: "We have ThrottlerModule.forRoot() in app.module.ts"
      'nestjs-security/require-throttler': [
        'warn',
        { assumeGlobalThrottler: true },
      ],

      // Or keep strict per-file checking and skip the project scan entirely
      // 'nestjs-security/require-guards': ['error', { detectGlobalGuards: false }],
    },
  },
];
```

### Alternative: Use Skip Decorators

The rules recognize common "bypass" decorators for intentionally unprotected endpoints:

```typescript
// These bypass require-guards
@Public()        // nestjs-passport pattern
@SkipAuth()      // common custom decorator
@AllowAnonymous() // alternative naming
@NoAuth()        // alternative naming

// These bypass require-throttler
@SkipThrottle()  // @nestjs/throttler built-in
```

### Where rate limiting is reported

`require-throttler` reports **once, on the root module** (`AppModule`, or any
`@Module` class in `app.module.ts`) when no `ThrottlerModule` is configured
anywhere in the project. Rate limiting is adopted with one module registration,
so reporting it on every route described a one-line fix as dozens of errors.

---

## 📦 Compatibility

| Package | Version                            |
| :------ | :--------------------------------- |
| ESLint  | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0`                         |

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
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-exposed-private-fields](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-exposed-private-fields?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-200 | A01:2021 |  | This rule detects sensitive fields (like passwords, tokens, secrets) in entity or DTO classes that are not… | 🟢 |  | ⚠️ |  |  |  |
| [no-hybrid-app-config-loss](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-hybrid-app-config-loss?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-20 | A03:2021 |  | Detect connectMicroservice() without inheritAppConfig, which silently drops every global pipe and guard fro… | 🟢 | 💼 |  |  |  |  |
| [no-missing-validation-pipe](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-missing-validation-pipe?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-20 | A03:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟡 |  | ⚠️ |  |  |  |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-permissive-cors?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-942 | A05:2021 |  | Flags CORS configured to accept any origin — a bare enableCors(), origin '*', or the reflecting origin true. | 🟢 | 💼 |  |  |  |  |
| [no-res-bypass-serialization](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-res-bypass-serialization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-200 | A01:2021 |  | This rule detects route handlers that inject @Res() without passthrough and then write an object, which sil… | 🟢 |  | ⚠️ |  |  |  |
| [no-unguarded-swagger](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-unguarded-swagger?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-200 | A01:2021 |  | This rule detects SwaggerModule.setup() running unconditionally in an application bootstrap, which publishe… | 🟢 |  | ⚠️ |  |  |  |
| [no-unsafe-multer-filename](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-unsafe-multer-filename?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-22 | A01:2021 |  | Flags a multer diskStorage filename callback that stores an upload under the name the client chose. | 🟢 | 💼 |  |  |  |  |
| [require-guards](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-guards?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-306 | A01:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [require-throttler](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-throttler?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-770 | A05:2021 |  | This rule detects NestJS controllers and route handlers that lack rate limiting, which can make the applica… | 🟢 |  | ⚠️ |  |  |  |
| [require-validation-pipe-whitelist](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-validation-pipe-whitelist?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security) | CWE-915 | A03:2021 |  | Requires whitelist true on ValidationPipe, so properties the DTO never declared are stripped instead of rea… | 🟢 | 💼 |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security"><img src="https://eslint.interlace.tools/images/og-nestjs-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-nestjs-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
