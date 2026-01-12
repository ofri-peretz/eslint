<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-express-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-express-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=express-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=express-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin offers comprehensive security rules tailored for Express.js applications, directly mapping to the OWASP Top 10 vulnerabilities. It proactively identifies security misconfigurations and unsafe coding patterns, helping you harden your server-side code against common attacks. Implementing these rules is an essential step in building secure, production-ready APIs and web services.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/express-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/express-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/express-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/express-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/express-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/express-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-express-security --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                                             |
| :------------ | :---------------------------------------------------------------------- |
| `recommended` | Balanced security for Express projects (critical as error, others warn) |
| `strict`      | Maximum security enforcement (all rules as errors)                      |
| `api`         | HTTP/API security rules only (CORS, CSRF, cookies, rate limiting)       |
| `graphql`     | GraphQL-specific security rules only                                    |

## 📚 Supported Libraries

| Library   | npm                                                                                                         | Downloads                                                                                                          | Detection                |
| :-------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `express` | [![npm](https://img.shields.io/npm/v/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | [![downloads](https://img.shields.io/npm/dt/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | Misconfig, DoS           |
| `helmet`  | [![npm](https://img.shields.io/npm/v/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | [![downloads](https://img.shields.io/npm/dt/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | Missing Security Headers |
| `cors`    | [![npm](https://img.shields.io/npm/v/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | [![downloads](https://img.shields.io/npm/dt/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | Permissive CORS          |
| `csurf`   | [![npm](https://img.shields.io/npm/v/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | [![downloads](https://img.shields.io/npm/dt/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | Missing CSRF Protection  |

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  // Baseline for all Express apps
  expressSecurity.configs.recommended,

  // Strict mode for payment/auth services
  {
    files: ['services/payments/**', 'services/auth/**'],
    ...expressSecurity.configs.strict,
  },

  // GraphQL security for GraphQL servers
  {
    files: ['services/graphql/**'],
    ...expressSecurity.configs.graphql,
  },
];
```

---

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set towarn in recommended preset.                       |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                                  |   CWE    | OWASP | CVSS | Description                                                                 | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------ | :------: | :---: | :--: | :-------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [require-helmet](https://eslint.interlace.tools/docs/express-security/rules/require-helmet)                                           | CWE-693  |       | 7.1  | [require-helmet](#require-helmet)                                           | 💼  |     |     |     |     |
| [no-permissive-cors](https://eslint.interlace.tools/docs/express-security/rules/no-permissive-cors)                                   | CWE-942  |       | 9.1  | [no-permissive-cors](#no-permissive-cors)                                   | 💼  |     |     |     |     |
| [no-cors-credentials-wildcard](https://eslint.interlace.tools/docs/express-security/rules/no-cors-credentials-wildcard)               | CWE-942  |       | 9.1  | [no-cors-credentials-wildcard](#no-cors-credentials-wildcard)               | 💼  |     |     |     |     |
| [require-express-body-parser-limits](https://eslint.interlace.tools/docs/express-security/rules/require-express-body-parser-limits)   | CWE-770  |       | 7.5  | [require-express-body-parser-limits](#require-express-body-parser-limits)   | 💼  | ⚠️  |     |     |     |
| [require-csrf-protection](https://eslint.interlace.tools/docs/express-security/rules/require-csrf-protection)                         | CWE-352  |       | 8.8  | [require-csrf-protection](#require-csrf-protection)                         | 💼  | ⚠️  |     |     |     |
| [no-insecure-cookie-options](https://eslint.interlace.tools/docs/express-security/rules/no-insecure-cookie-options)                   | CWE-614  |       | 5.3  | [no-insecure-cookie-options](#no-insecure-cookie-options)                   | 💼  |     |     |     |     |
| [require-rate-limiting](https://eslint.interlace.tools/docs/express-security/rules/require-rate-limiting)                             | CWE-770  |       | 7.5  | [require-rate-limiting](#require-rate-limiting)                             | 💼  | ⚠️  |     |     |     |
| [no-express-unsafe-regex-route](https://eslint.interlace.tools/docs/express-security/rules/no-express-unsafe-regex-route)             | CWE-1333 |       | 7.5  | [no-express-unsafe-regex-route](#no-express-unsafe-regex-route)             | 💼  |     |     |     |     |
| [no-graphql-introspection-production](https://eslint.interlace.tools/docs/express-security/rules/no-graphql-introspection-production) | CWE-200  |       | 5.3  | [no-graphql-introspection-production](#no-graphql-introspection-production) | 💼  | ⚠️  |     |     |     |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules.               |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/express-security"><img src="https://eslint.interlace.tools/images/og-express-security.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
