<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Advanced React patterns, hook usage, and best practices enforcement.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-react-features" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-react-features.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-react-features" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-react-features.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react-features" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react-features" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin optimizes your React development by enforcing advanced patterns, proper hook usage, and industry best practices. It identifies inefficient rendering, improper state management, and potential memory leaks, ensuring your application runs smoothly. By following these guidelines, you can write more robust and performant React code that aligns with the specialized features of the framework.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/react-features), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/react-features), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/react-features) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/react-features)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/react-features), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/react-features)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-react-features --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                      |
| :------------ | :----------------------------------------------- |
| `recommended` | Recommended React patterns and performance rules |

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

| Rule                                                                                                              | Pattern/Concept | Description                    | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------- | :-------------- | :----------------------------- | :-: | :-: | :-: | :-: | :-: |
| [`hooks-exhaustive-deps`](https://eslint.interlace.tools/docs/react-features/rules/hooks-exhaustive-deps)         | Hooks           | Check effect dependencies      | 💼  |     | 🔧  |     |     |
| [`jsx-key`](https://eslint.interlace.tools/docs/react-features/rules/jsx-key)                                     | React           | Detect missing string keys     | 💼  |     |     |     |     |
| [`no-direct-mutation-state`](https://eslint.interlace.tools/docs/react-features/rules/no-direct-mutation-state)   | React           | Prevent direct state mutation  | 💼  |     |     |     |     |
| [`no-unknown-property`](https://eslint.interlace.tools/docs/react-features/rules/no-unknown-property)             | React           | Detect unknown DOM properties  | 💼  |     | 🔧  |     |     |
| [`require-optimization`](https://eslint.interlace.tools/docs/react-features/rules/require-optimization)           | Performance     | Enforce component optimization |     | ⚠️  |     |     |     |
| [`no-danger`](https://eslint.interlace.tools/docs/react-features/rules/no-danger)                                 | Security        | Disallow dangerous HTML use    | 💼  |     |     |     |     |
| [`no-children-prop`](https://eslint.interlace.tools/docs/react-features/rules/no-children-prop)                   | React           | Disallow children as prop      | 💼  |     |     |     |     |
| [`jsx-no-bind`](https://eslint.interlace.tools/docs/react-features/rules/jsx-no-bind)                             | Performance     | Disallow bind in JSX           |     | ⚠️  |     |     |     |
| [`no-unnecessary-rerenders`](https://eslint.interlace.tools/docs/react-features/rules/no-unnecessary-rerenders)   | Performance     | Prevent unnecessary rerenders  | 💼  |     |     |     |     |
| [`react-render-optimization`](https://eslint.interlace.tools/docs/react-features/rules/react-render-optimization) | Performance     | Optimize render methods        | 💼  |     |     |     |     |
| [`react-no-inline-functions`](https://eslint.interlace.tools/docs/react-features/rules/react-no-inline-functions) | Performance     | Disallow inline functions      |     | ⚠️  |     |     |     |

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
  <a href="https://eslint.interlace.tools/docs/react-features"><img src="https://eslint.interlace.tools/images/og-react-features.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
