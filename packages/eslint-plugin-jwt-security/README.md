<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://jwt.io" target="_blank"><img src="https://eslint.interlace.tools/logos/jwt.svg" alt="JSON Web Tokens" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security validation for JSON Web Tokens (JWT) implementation (signing, verification).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-jwt-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-jwt-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-jwt-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-jwt-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security validation for JSON Web Tokens (JWT) implementation (signing, verification).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

**Every rule here is built to be worth reading.** A linter that reports a thousand
things a week gets switched off in a month, and the real finding goes with it — so a
rule fires on what the code *does*, resolved through the AST and ESLint's own scope
analysis, never on an identifier that happens to contain `query` or a path that
contains `key`. Every finding carries its fix on the message, in prose for a human and
as structured JSON for an agent; security rules add a CWE mapping and, where one is
assigned, a CVSS score.

That trade costs recall, and we measure what it costs rather than assuming it is free:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).
If a finding is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security). 📚

```bash
npm install eslint-plugin-jwt-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                               |
| :------------ | :-------------------------------------------------------- |
| `recommended` | Recommended preset - balanced security                    |
| `strict`      | Strict preset - maximum security (includes 2025 research) |
| `legacy`      | Legacy preset - migration mode                            |
| `all`         | All rules preset                                          |

## 📚 Supported Libraries
| Library        | npm                                                                                                                   | Downloads                                                                                                                    | Detection                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| `jsonwebtoken` | [![npm](https://img.shields.io/npm/v/jsonwebtoken.svg?style=flat-square)](https://www.npmjs.com/package/jsonwebtoken) | [![downloads](https://img.shields.io/npm/dt/jsonwebtoken.svg?style=flat-square)](https://www.npmjs.com/package/jsonwebtoken) | Signing, Verification, Decoding |
| `jose`         | [![npm](https://img.shields.io/npm/v/jose.svg?style=flat-square)](https://www.npmjs.com/package/jose)                 | [![downloads](https://img.shields.io/npm/dt/jose.svg?style=flat-square)](https://www.npmjs.com/package/jose)                 | Verification (Fix Suggestion)   |
| `jwt-decode`   | [![npm](https://img.shields.io/npm/v/jwt-decode.svg?style=flat-square)](https://www.npmjs.com/package/jwt-decode)     | [![downloads](https://img.shields.io/npm/dt/jwt-decode.svg?style=flat-square)](https://www.npmjs.com/package/jwt-decode)     | Unsafe Decoding                 |

## 🤖 AI-Optimized Messages
Every rule uses `formatLLMMessage` for structured output:

```
🔒 CWE-347 OWASP:A02-Crypto CVSS:9.8 | Using alg:"none" bypasses signature verification
   Fix: Remove "none" and use RS256, ES256, or other secure algorithms
   https://nvd.nist.gov/vuln/detail/CVE-2022-23540
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

By structuring errors with specific CWE codes, OWASP categories, and direct fix suggestions, this format allows AI coding assistants to autonomously identify, explain, and resolve security vulnerabilities with high confidence.

## 💡 What You Get
- **13 Security Rules** - Algorithm attacks, replay prevention, claim validation
- **6 JWT Libraries** - jsonwebtoken, jose, express-jwt, @nestjs/jwt, jwks-rsa, jwt-decode
- **2025 Research** - "Back to the Future" replay attack prevention (LightSEC 2025)
- **AI-Optimized** - Structured messages for GitHub Copilot, Cursor, Claude assistance
- **CWE References** - Every rule maps to Common Weakness Enumeration

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
| [no-algorithm-confusion](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-algorithm-confusion?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-347 |  |  | This rule detects algorithm confusion attacks where symmetric algorithms (HS256, HS384, HS512) are used wit… | 🟢 | 💼 |  |  |  |  |
| [no-algorithm-none](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-algorithm-none?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-347 |  |  | This rule detects attempts to use the none algorithm which completely bypasses JWT signature verification | 🟢 | 💼 |  |  |  |  |
| [no-decode-without-verify](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-decode-without-verify?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-345 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-secret](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-hardcoded-secret?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-798 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-payload](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-sensitive-payload?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-359 |  |  | JWT payloads are NOT encrypted, only base64-encoded | 🟢 |  | ⚠️ |  |  |  |
| [no-timestamp-manipulation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-timestamp-manipulation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-294 |  |  | This rule detects noTimestamp: true which disables automatic iat (issued at) claim generation | 🟢 | 💼 |  |  |  |  |
| [no-weak-secret](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-weak-secret?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-326 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [require-algorithm-whitelist](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-algorithm-whitelist?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-757 |  |  | This rule enforces explicit algorithm specification in verify() calls | 🟢 | 💼 |  |  |  |  |
| [require-audience-validation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-audience-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-287 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-expiration](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-expiration?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-613 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [require-issued-at](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-issued-at?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-294 |  |  | This rule ensures tokens have the iat claim for freshness validation | 🟢 |  |  |  |  |  |
| [require-issuer-validation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-issuer-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-287 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-max-age](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-max-age?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security) | CWE-294 |  |  | This rule mandates maxAge in verify operations | 🟢 |  |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security"><img src="https://eslint.interlace.tools/images/og-jwt-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
