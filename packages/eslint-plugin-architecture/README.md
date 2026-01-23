<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Architectural boundaries, circular dependency detection, and module structure.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-architecture" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-architecture.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-architecture" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-architecture.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=architecture" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=architecture" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin helps maintain clean code architecture by enforcing strict boundaries and detecting circular dependencies within your project. It aims to prevent spaghetti code and ensures that your module structure remains scalable and maintainable as your codebase grows. By visualizing and enforcing these architectural constraints, teams can collaborate more effectively on large-scale applications.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/architecture), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/architecture), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/architecture) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/architecture)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/architecture), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/architecture)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-architecture --save-dev
```

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

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                      |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                          | Pattern/Concept | Description                          | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [`consistent-existence-index-check`](https://eslint.interlace.tools/docs/architecture/rules/consistent-existence-index-check) | Architecture    | Consistent existence check           |     |     |     |     |     |
| [`prefer-event-target`](https://eslint.interlace.tools/docs/architecture/rules/prefer-event-target)                           | Architecture    | Prefer EventTarget over EventEmitter |     |     |     |     |     |
| [`prefer-at`](https://eslint.interlace.tools/docs/architecture/rules/prefer-at)                                               | Architecture    | Prefer `.at()` for index access      | 💼  |     |     |     |     |
| [`no-unreadable-iife`](https://eslint.interlace.tools/docs/architecture/rules/no-unreadable-iife)                             | Architecture    | Avoid unreadable IIFEs               |     |     |     |     |     |
| [`no-await-in-loop`](https://eslint.interlace.tools/docs/architecture/rules/no-await-in-loop)                                 | Architecture    | Avoid await inside loops             |     |     |     |     |     |
| [`no-external-api-calls-in-utils`](https://eslint.interlace.tools/docs/architecture/rules/no-external-api-calls-in-utils)     | Architecture    | Prevent external API calls in utils  | 💼  |     |     |     |     |
| [`consistent-function-scoping`](https://eslint.interlace.tools/docs/architecture/rules/consistent-function-scoping)           | Architecture    | Enforce consistent function scoping  |     |     |     |     |     |
| [`filename-case`](https://eslint.interlace.tools/docs/architecture/rules/filename-case)                                       | Architecture    | Enforce filename casing              |     |     |     |     |     |
| [`no-instanceof-array`](https://eslint.interlace.tools/docs/architecture/rules/no-instanceof-array)                           | Architecture    | Avoid `instanceof Array`             |     |     |     |     |     |
| [`ddd-anemic-domain-model`](https://eslint.interlace.tools/docs/architecture/rules/ddd-anemic-domain-model)                   | DDD             | Prevent anemic domain models         | 💼  |     |     |     |     |
| [`ddd-value-object-immutability`](https://eslint.interlace.tools/docs/architecture/rules/ddd-value-object-immutability)       | DDD             | Enforce value object immutability    |     |     |     |     |     |
| [`enforce-naming`](https://eslint.interlace.tools/docs/architecture/rules/enforce-naming)                                     | Domain          | Enforce domain naming conventions    | 💼  |     |     |     |     |
| [`enforce-rest-conventions`](https://eslint.interlace.tools/docs/architecture/rules/enforce-rest-conventions)                 | API             | Enforce REST API conventions         | 💼  |     |     |     |     |

---

## ⚙️ Configuration Presets

| Preset        | Description                    |
| :------------ | :----------------------------- |
| `recommended` | Recommended architecture rules |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/architecture"><img src="https://eslint.interlace.tools/images/og-architecture.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
