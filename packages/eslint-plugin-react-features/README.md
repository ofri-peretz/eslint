<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://react.dev" target="_blank"><img src="https://eslint.interlace.tools/logos/react.svg" alt="React" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  Advanced React patterns, hook usage, and best practices enforcement.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-react-features" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-react-features.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-react-features" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-react-features.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-react-features" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-react-features" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-react-features" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-react-features" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Advanced React patterns, hook usage, and best practices enforcement.

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

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-react-features?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features). 📚

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
| [checked-requires-onchange-or-readonly](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/checked-requires-onchange-or-readonly?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | checked-requires-onchange-or-readonly rule | 🟢 |  |  |  | 💡 |  |
| [default-props-match-prop-types](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/default-props-match-prop-types?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | default-props-match-prop-types rule | 🟢 |  |  |  | 💡 |  |
| [display-name](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/display-name?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | display-name rule | 🟢 |  |  |  | 💡 |  |
| [hooks-exhaustive-deps](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/hooks-exhaustive-deps?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | hooks-exhaustive-deps rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [jsx-handler-names](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-handler-names?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | jsx-handler-names rule | 🟢 |  |  |  | 💡 |  |
| [jsx-key](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-key?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | jsx-key rule | 🟢 | 💼 |  |  | 💡 |  |
| [jsx-max-depth](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-max-depth?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | jsx-max-depth rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-bind](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-bind?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | jsx-no-bind rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-duplicate-props](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-duplicate-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Prevent duplicate props in JSX elements. This rule is part of eslint-plugin-react-features and provides LLM… | 🟢 | 💼 |  |  | 💡 |  |
| [jsx-no-literals](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-literals?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | jsx-no-literals rule | 🟢 |  |  |  | 💡 |  |
| [jsx-no-script-url](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-script-url?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Prevent javascript: URLs in JSX. This rule is part of eslint-plugin-react-features and provides LLM-optimiz… | 🟢 | 💼 |  |  | 💡 |  |
| [jsx-no-target-blank](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/jsx-no-target-blank?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Require rel='noopener noreferrer' with target='_blank'. This rule is part of eslint-plugin-react-features a… | 🟢 | 💼 |  |  | 💡 |  |
| [no-access-state-in-setstate](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-access-state-in-setstate?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-access-state-in-setstate rule | 🟢 |  |  |  | 💡 |  |
| [no-adjacent-inline-elements](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-adjacent-inline-elements?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-adjacent-inline-elements rule | 🟢 |  |  |  | 💡 |  |
| [no-arbitrary-token-class](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-arbitrary-token-class?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-arrow-function-lifecycle](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-arrow-function-lifecycle?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-arrow-function-lifecycle rule | 🟢 |  |  |  | 💡 |  |
| [no-children-prop](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-children-prop?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-children-prop rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-danger](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-danger?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) | CWE-79 |  |  | no-danger rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-danger-with-children](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-danger-with-children?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Prevent using children and dangerouslySetInnerHTML together. This rule is part of eslint-plugin-react-featu… | 🟢 | 💼 |  |  | 💡 |  |
| [no-default-test-id](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-default-test-id?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-deprecated](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-deprecated?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Warn about using deprecated React APIs. This rule is part of eslint-plugin-react-features and provides LLM-… | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-did-mount-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-did-mount-set-state?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-did-mount-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-did-update-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-did-update-set-state?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-did-update-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-direct-mutation-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-direct-mutation-state?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-direct-mutation-state rule | 🟢 |  |  |  | 💡 |  |
| [no-find-dom-node](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-find-dom-node?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Prevent using findDOMNode. This rule is part of eslint-plugin-react-features and provides LLM-optimized err… | 🟢 |  |  |  | 💡 |  |
| [no-inline-style](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-inline-style?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-invalid-html-attribute](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-invalid-html-attribute?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-invalid-html-attribute rule | 🟢 |  |  |  | 💡 |  |
| [no-is-mounted](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-is-mounted?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-is-mounted rule | 🟢 |  |  |  | 💡 |  |
| [no-is-prefix-prop](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-is-prefix-prop?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-kind-prop-discriminator](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-kind-prop-discriminator?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-multi-comp](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-multi-comp?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-multi-comp rule | 🟢 |  |  |  | 💡 |  |
| [no-namespace](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-namespace?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-namespace rule | 🟢 |  |  |  | 💡 |  |
| [no-object-type-as-default-prop](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-object-type-as-default-prop?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-object-type-as-default-prop rule | 🟢 |  |  |  | 💡 |  |
| [no-raw-color-literal](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-raw-color-literal?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-redundant-should-component-update](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-redundant-should-component-update?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-redundant-should-component-update rule | 🟢 |  |  |  | 💡 |  |
| [no-render-return-value](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-render-return-value?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-render-return-value rule | 🟢 |  |  |  | 💡 |  |
| [no-set-state](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-set-state?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-set-state rule | 🟢 |  |  |  | 💡 |  |
| [no-string-refs](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-string-refs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-string-refs rule | 🟢 | 💼 |  |  | 💡 |  |
| [no-this-in-sfc](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-this-in-sfc?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-this-in-sfc rule | 🟢 |  |  |  | 💡 |  |
| [no-typos](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-typos?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-typos rule | 🟢 |  |  |  | 💡 |  |
| [no-unescaped-entities](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unescaped-entities?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-unescaped-entities rule | 🟢 |  |  |  | 💡 |  |
| [no-unknown-property](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unknown-property?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-unknown-property rule | 🟢 | 💼 |  |  | 💡 |  |
| [no-unnecessary-rerenders](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unnecessary-rerenders?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | no-unnecessary-rerenders rule | 🟢 |  |  |  | 💡 |  |
| [no-unsafe](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-unsafe?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Warn about UNSAFE_ lifecycle methods. This rule is part of eslint-plugin-react-features and provides LLM-op… | 🟢 |  |  |  | 💡 |  |
| [no-wrapper-sub-component](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/no-wrapper-sub-component?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [prefer-es6-class](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prefer-es6-class?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | prefer-es6-class rule | 🟢 |  |  |  | 💡 |  |
| [prefer-stateless-function](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prefer-stateless-function?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | prefer-stateless-function rule | 🟢 |  |  |  | 💡 |  |
| [prop-types](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/prop-types?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | prop-types rule | 🟢 |  |  |  | 💡 |  |
| [react-class-to-hooks](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-class-to-hooks?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | react-class-to-hooks rule | 🟢 |  |  |  | 💡 |  |
| [react-in-jsx-scope](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-in-jsx-scope?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | react-in-jsx-scope rule | 🟢 |  |  |  | 💡 |  |
| [react-no-inline-functions](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-no-inline-functions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | react-no-inline-functions rule | 🟢 |  |  |  | 💡 |  |
| [react-render-optimization](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/react-render-optimization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | react-render-optimization rule | 🟢 |  |  |  | 💡 |  |
| [require-data-slot](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-data-slot?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  |  | 🟢 |  |  |  |  |  |
| [require-default-props](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-default-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | require-default-props rule | 🟢 |  |  |  | 💡 |  |
| [require-optimization](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-optimization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | require-optimization rule | 🟢 |  |  |  | 💡 |  |
| [require-render-return](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/require-render-return?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | require-render-return rule | 🟢 |  |  |  | 💡 |  |
| [required-attributes](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/required-attributes?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | required-attributes rule | 🟢 |  |  |  | 💡 |  |
| [sort-comp](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/sort-comp?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | sort-comp rule | 🟢 |  |  |  | 💡 |  |
| [state-in-constructor](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/state-in-constructor?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | state-in-constructor rule | 🟢 |  |  |  | 💡 |  |
| [static-property-placement](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/static-property-placement?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | static-property-placement rule | 🟢 |  |  |  | 💡 |  |
| [void-dom-elements-no-children](https://eslint.interlace.tools/docs/quality/plugin-react-features/rules/void-dom-elements-no-children?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features) |  |  |  | Prevent void DOM elements from receiving children. This rule is part of eslint-plugin-react-features and pr… | 🟢 |  |  |  | 💡 |  |
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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-features?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features"><img src="https://eslint.interlace.tools/images/og-react-features.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-features" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
