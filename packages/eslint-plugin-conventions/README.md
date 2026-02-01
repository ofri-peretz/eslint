<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code conventions and style enforcement for JavaScript/TypeScript teams.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-conventions.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-conventions.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

## Description

This plugin enforces consistent code conventions and style patterns across JavaScript and TypeScript projects. It helps teams maintain clean, readable, and maintainable codebases by detecting commented-out code, expired TODOs, deprecated API usage, and inconsistent naming patterns.

## Philosophy

**Interlace** fosters **strength through integration**. We believe conventions should be enforced automatically, not debated endlessly. These rules capture best practices from top engineering teams and enforce them consistently across your codebase.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/conventions), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-conventions --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                         |
| :------------ | :---------------------------------- |
| `recommended` | Balanced conventions for most teams |

---

## 🏢 Usage Example

```js
// eslint.config.js
import conventions from 'eslint-plugin-conventions';

export default [conventions.configs.recommended];
```

---

## Rules

| Rule                                                                                     | Description                                               | 💼  | ⚠️  |
| :--------------------------------------------------------------------------------------- | :-------------------------------------------------------- | :-: | :-: |
| [no-commented-code](./docs/rules/no-commented-code.md)                                   | Disallow commented-out code blocks                        | 💼  | ⚠️  |
| [expiring-todo-comments](./docs/rules/expiring-todo-comments.md)                         | Enforce expiration dates on TODO comments                 | 💼  | ⚠️  |
| [prefer-code-point](./docs/rules/prefer-code-point.md)                                   | Prefer `codePointAt` over `charCodeAt` for Unicode safety |     |     |
| [prefer-dom-node-text-content](./docs/rules/prefer-dom-node-text-content.md)             | Prefer `textContent` over `innerText` for performance     |     |     |
| [no-console-spaces](./docs/rules/no-console-spaces.md)                                   | Disallow leading/trailing spaces in console calls         |     |     |
| [no-deprecated-api](./docs/rules/no-deprecated-api.md)                                   | Disallow usage of deprecated Node.js APIs                 | 💼  | ⚠️  |
| [prefer-dependency-version-strategy](./docs/rules/prefer-dependency-version-strategy.md) | Enforce consistent version strategies in package.json     |     |     |
| [filename-case](./docs/rules/filename-case.md)                                           | Enforce consistent file naming conventions                |     |     |
| [consistent-existence-index-check](./docs/rules/consistent-existence-index-check.md)     | Enforce consistent array index existence checks           |     |     |

**Legend**: 💼 Recommended | ⚠️ Warns (not error)

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native quality plugins with LLM-optimized error messages:

| Plugin                                                                                         | Description                         |
| :--------------------------------------------------------------------------------------------- | :---------------------------------- |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive complexity & code quality |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability)         | Error handling & null safety        |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability)         | Production readiness & debug code   |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
