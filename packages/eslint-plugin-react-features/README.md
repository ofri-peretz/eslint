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

This plugin provides Advanced React patterns, hook usage, and best practices enforcement.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-react-features), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-react-features), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-react-features) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-react-features)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-react-features), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-react-features)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-react-features --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                      |
| :------------ | :----------------------------------------------- |
| `recommended` | Recommended React patterns and performance rules |

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [checked-requires-onchange-or-readonly](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/checked-requires-onchange-or-readonly) |  |  |  | checked-requires-onchange-or-readonly rule | 🟢 |  |  |  | 💡 |  |
| [default-props-match-prop-types](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/default-props-match-prop-types) |  |  |  | default-props-match-prop-types rule | 🟢 |  |  |  | 💡 |  |
| [display-name](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/display-name) |  |  |  | display-name rule | 🟢 |  |  |  | 💡 |  |
| [hooks-exhaustive-deps](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/hooks-exhaustive-deps) |  |  |  | hooks-exhaustive-deps rule | 🟢 |  |  |  | 💡 |  |
| [jsx-handler-names](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-handler-names) |  |  |  | jsx-handler-names rule | 🟢 |  |  |  | 💡 |  |
| [jsx-key](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-key) |  |  |  | jsx-key rule | 🟢 |  |  |  | 💡 |  |
| [jsx-max-depth](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-max-depth) |  |  |  | jsx-max-depth rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-bind](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-bind) |  |  |  | jsx-no-bind rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-duplicate-props](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-duplicate-props) |  |  |  | Prevent duplicate props in JSX elements. This rule is part of eslint-plugin-react-features and provides LLM… | 🟢 |  |  |  | 💡 |  |
| [jsx-no-literals](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-literals) |  |  |  | jsx-no-literals rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-script-url](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-script-url) |  |  |  | Prevent javascript: URLs in JSX. This rule is part of eslint-plugin-react-features and provides LLM-optimiz… | 🟢 |  |  |  | 💡 |  |
| [jsx-no-target-blank](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-target-blank) |  |  |  | Require rel='noopener noreferrer' with target='_blank'. This rule is part of eslint-plugin-react-features a… | 🟢 |  |  |  | 💡 |  |
| [no-access-state-in-setstate](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-access-state-in-setstate) |  |  |  | no-access-state-in-setstate rule | 🟢 |  |  |  | 💡 |  |
| [no-adjacent-inline-elements](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-adjacent-inline-elements) |  |  |  | no-adjacent-inline-elements rule | 🟢 |  |  |  | 💡 |  |
| [no-arrow-function-lifecycle](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-arrow-function-lifecycle) |  |  |  | no-arrow-function-lifecycle rule | 🟢 |  |  |  | 💡 |  |
| [no-children-prop](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-children-prop) |  |  |  | no-children-prop rule | 🟢 |  |  |  | 💡 |  |
| [no-danger](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-danger) | CWE-79 |  |  | no-danger rule | 🟢 |  |  |  | 💡 |  |
| [no-danger-with-children](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-danger-with-children) |  |  |  | Prevent using children and dangerouslySetInnerHTML together. This rule is part of eslint-plugin-react-featu… | 🟢 |  |  |  | 💡 |  |
| [no-deprecated](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-deprecated) |  |  |  | Warn about using deprecated React APIs. This rule is part of eslint-plugin-react-features and provides LLM-… | 🟢 |  |  |  | 💡 |  |
| [no-did-mount-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-did-mount-set-state) |  |  |  | no-did-mount-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-did-update-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-did-update-set-state) |  |  |  | no-did-update-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-direct-mutation-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-direct-mutation-state) |  |  |  | no-direct-mutation-state rule | 🟢 |  |  |  | 💡 |  |
| [no-find-dom-node](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-find-dom-node) |  |  |  | Prevent using findDOMNode. This rule is part of eslint-plugin-react-features and provides LLM-optimized err… | 🟢 |  |  |  | 💡 |  |
| [no-invalid-html-attribute](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-invalid-html-attribute) |  |  |  | no-invalid-html-attribute rule | 🟢 |  |  |  | 💡 |  |
| [no-is-mounted](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-is-mounted) |  |  |  | no-is-mounted rule | 🟢 |  |  |  | 💡 |  |
| [no-multi-comp](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-multi-comp) |  |  |  | no-multi-comp rule | 🟢 |  |  |  | 💡 |  |
| [no-namespace](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-namespace) |  |  |  | no-namespace rule | 🟢 |  |  |  | 💡 |  |
| [no-object-type-as-default-prop](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-object-type-as-default-prop) |  |  |  | no-object-type-as-default-prop rule | 🟢 |  |  |  | 💡 |  |
| [no-redundant-should-component-update](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-redundant-should-component-update) |  |  |  | no-redundant-should-component-update rule | 🟢 |  |  |  | 💡 |  |
| [no-render-return-value](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-render-return-value) |  |  |  | no-render-return-value rule | 🟢 |  |  |  | 💡 |  |
| [no-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-set-state) |  |  |  | no-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-string-refs](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-string-refs) |  |  |  | no-string-refs rule | 🟢 |  |  |  | 💡 |  |
| [no-this-in-sfc](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-this-in-sfc) |  |  |  | no-this-in-sfc rule | 🟢 |  |  |  | 💡 |  |
| [no-typos](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-typos) |  |  |  | no-typos rule | 🟢 |  |  |  | 💡 |  |
| [no-unescaped-entities](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unescaped-entities) |  |  |  | no-unescaped-entities rule | 🟢 |  |  |  | 💡 |  |
| [no-unknown-property](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unknown-property) |  |  |  | no-unknown-property rule | 🟢 |  |  |  | 💡 |  |
| [no-unnecessary-rerenders](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unnecessary-rerenders) |  |  |  | no-unnecessary-rerenders rule | 🟢 |  |  |  | 💡 |  |
| [no-unsafe](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unsafe) |  |  |  | Warn about UNSAFE_ lifecycle methods. This rule is part of eslint-plugin-react-features and provides LLM-op… | 🟢 |  |  |  | 💡 |  |
| [prefer-es6-class](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prefer-es6-class) |  |  |  | prefer-es6-class rule | 🟢 |  |  |  | 💡 |  |
| [prefer-stateless-function](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prefer-stateless-function) |  |  |  | prefer-stateless-function rule | 🟢 |  |  |  | 💡 |  |
| [prop-types](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prop-types) |  |  |  | prop-types rule | 🟢 |  |  |  | 💡 |  |
| [react-class-to-hooks](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-class-to-hooks) |  |  |  | react-class-to-hooks rule | 🟢 |  |  |  | 💡 |  |
| [react-in-jsx-scope](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-in-jsx-scope) |  |  |  | react-in-jsx-scope rule | 🟢 |  |  |  | 💡 |  |
| [react-no-inline-functions](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-no-inline-functions) |  |  |  | react-no-inline-functions rule | 🟢 |  |  |  | 💡 |  |
| [react-render-optimization](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-render-optimization) |  |  |  | react-render-optimization rule | 🟢 |  |  |  | 💡 |  |
| [require-default-props](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-default-props) |  |  |  | require-default-props rule | 🟢 |  |  |  | 💡 |  |
| [require-optimization](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-optimization) |  |  |  | require-optimization rule | 🟢 |  |  |  | 💡 |  |
| [require-render-return](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-render-return) |  |  |  | require-render-return rule | 🟢 |  |  |  | 💡 |  |
| [required-attributes](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/required-attributes) |  |  |  | required-attributes rule | 🟢 |  |  |  | 💡 |  |
| [sort-comp](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/sort-comp) |  |  |  | sort-comp rule | 🟢 |  |  |  | 💡 |  |
| [state-in-constructor](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/state-in-constructor) |  |  |  | state-in-constructor rule | 🟢 |  |  |  | 💡 |  |
| [static-property-placement](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/static-property-placement) |  |  |  | static-property-placement rule | 🟢 |  |  |  | 💡 |  |
| [void-dom-elements-no-children](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/void-dom-elements-no-children) |  |  |  | Prevent void DOM elements from receiving children. This rule is part of eslint-plugin-react-features and pr… | 🟢 |  |  |  | 💡 |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-features"><img src="https://eslint.interlace.tools/images/og-react-features.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>