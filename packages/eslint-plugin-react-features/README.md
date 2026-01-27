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

**Interlace** fosters **strength through integration**. We **interlace** React best practices directly into your workflow, catching bugs and performance issues before they ship. Tools should **guide rather than gatekeep**, providing educational feedback that strengthens developers.

**Why an independent ecosystem?** 🚀 Ship fast without upstream bureaucracy • 🤖 AI-optimized messages (severity, fixes) • ⚡ Unified codebase for performance • 🏗️ Consistent patterns across all plugins • 📚 Educational "why" explanations

All rules are **clean-room implementations** following `eslint-plugin-react` naming conventions — familiar API, better engineering.

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

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                      |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |

| Rule                                    | Description                                             | 💼  | ⚠️  | 🔧  |
| :-------------------------------------- | :------------------------------------------------------ | :-: | :-: | :-: |
| `jsx-key`                               | React: Detect missing key props in iterators            | 💼  |     |     |
| `no-direct-mutation-state`              | React: Prevent direct state mutation                    | 💼  |     |     |
| `no-children-prop`                      | React: Disallow passing children as prop                | 💼  |     |     |
| `no-string-refs`                        | React: Disallow string refs                             | 💼  |     |     |
| `no-unknown-property`                   | React: Detect unknown DOM properties                    | 💼  |     | 🔧  |
| `no-unescaped-entities`                 | React: Disallow unescaped entities in JSX               | 💼  |     |     |
| `display-name`                          | React: Require displayName for components               |     | ⚠️  |     |
| `no-this-in-sfc`                        | React: Disallow `this` in stateless components          | 💼  |     |     |
| `no-access-state-in-setstate`           | React: Prevent using this.state in setState             | 💼  |     |     |
| `no-render-return-value`                | React: Prevent using ReactDOM.render return value       | 💼  |     |     |
| `require-render-return`                 | React: Require return in render method                  | 💼  |     |     |
| `react-in-jsx-scope`                    | React: Require React in scope (pre-17)                  |     |     |     |
| `jsx-no-target-blank`                   | Security: Require rel="noopener" with target="\_blank"  | 💼  |     |     |
| `jsx-no-script-url`                     | Security: Disallow javascript: URLs                     | 💼  |     |     |
| `jsx-no-duplicate-props`                | Security: Prevent duplicate props                       | 💼  |     |     |
| `no-danger`                             | Security: Disallow dangerouslySetInnerHTML              | 💼  |     |     |
| `no-danger-with-children`               | Security: Prevent dangerouslySetInnerHTML with children | 💼  |     |     |
| `hooks-exhaustive-deps`                 | Hooks: Check effect dependencies                        | 💼  |     | 🔧  |
| `jsx-no-bind`                           | Performance: Disallow .bind() in JSX props              |     | ⚠️  |     |
| `no-unnecessary-rerenders`              | Performance: Detect patterns causing rerenders          | 💼  |     |     |
| `react-render-optimization`             | Performance: Suggest render optimizations               | 💼  |     |     |
| `react-no-inline-functions`             | Performance: Disallow inline functions in JSX           |     | ⚠️  |     |
| `require-optimization`                  | Performance: Enforce shouldComponentUpdate              |     | ⚠️  |     |
| `no-object-type-as-default-prop`        | Performance: Prevent object/array as default prop       |     | ⚠️  |     |
| `no-did-mount-set-state`                | Class: Disallow setState in componentDidMount           |     | ⚠️  |     |
| `no-did-update-set-state`               | Class: Disallow setState in componentDidUpdate          |     | ⚠️  |     |
| `no-set-state`                          | Class: Disallow setState usage                          |     |     |     |
| `prefer-es6-class`                      | Class: Enforce ES6 class for components                 |     | ⚠️  |     |
| `prefer-stateless-function`             | Class: Suggest stateless functions when possible        |     | ⚠️  |     |
| `no-redundant-should-component-update`  | Class: Prevent useless shouldComponentUpdate            | 💼  |     |     |
| `no-arrow-function-lifecycle`           | Class: Disallow arrow functions for lifecycle           |     | ⚠️  |     |
| `sort-comp`                             | Class: Enforce component method order                   |     |     |     |
| `state-in-constructor`                  | Class: Enforce state initialization in constructor      |     |     |     |
| `static-property-placement`             | Class: Enforce static property placement                |     |     |     |
| `no-deprecated`                         | Deprecated: Warn about deprecated React APIs            |     | ⚠️  |     |
| `no-find-dom-node`                      | Deprecated: Disallow findDOMNode                        | 💼  |     |     |
| `no-is-mounted`                         | Deprecated: Disallow isMounted usage                    | 💼  |     |     |
| `no-unsafe`                             | Deprecated: Disallow UNSAFE\_ lifecycle methods         |     | ⚠️  |     |
| `void-dom-elements-no-children`         | Deprecated: Prevent void elements with children         | 💼  |     |     |
| `jsx-handler-names`                     | JSX: Enforce event handler naming conventions           |     |     |     |
| `jsx-max-depth`                         | JSX: Enforce maximum JSX nesting depth                  |     |     |     |
| `jsx-no-literals`                       | JSX: Disallow string literals in JSX                    |     |     |     |
| `no-namespace`                          | JSX: Disallow namespace in JSX                          |     | ⚠️  |     |
| `no-adjacent-inline-elements`           | JSX: Prevent adjacent inline elements                   |     |     |     |
| `no-invalid-html-attribute`             | JSX: Disallow invalid HTML attributes                   |     | ⚠️  |     |
| `prop-types`                            | Props: Validate prop types                              |     |     |     |
| `require-default-props`                 | Props: Require default props for optional props         |     |     |     |
| `default-props-match-prop-types`        | Props: Ensure defaultProps match propTypes              |     | ⚠️  |     |
| `checked-requires-onchange-or-readonly` | Props: Require onChange or readOnly with checked        | 💼  |     |     |
| `no-typos`                              | Props: Prevent common typos in properties               | 💼  |     |     |
| `no-multi-comp`                         | Props: Prevent multiple components per file             |     |     |     |
| `react-class-to-hooks`                  | Migration: Assist class to hooks migration              |     |     | 💡  |

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

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     |                                                                         Downloads                                                                          | Description                                |
| :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y)    | React accessibility & WCAG compliance.     |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)        | NodeJS Cryptography security rules.        |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                     |           [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)           | JWT security & best practices.             |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/react-features"><img src="https://eslint.interlace.tools/images/og-react-features.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
