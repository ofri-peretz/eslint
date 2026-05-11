<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Next-generation import sorting, validation, and architectural boundaries.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-import-next" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-import-next.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-import-next" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-import-next.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=import-next" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=import-next" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Next-generation import sorting, validation, and architectural boundaries.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-import-next), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-import-next), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-import-next) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-import-next)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-import-next), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-import-next)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-import-next --save-dev
```

## ⚙️ Configuration Presets
| Preset              | Description                                      |
| :------------------ | :----------------------------------------------- |
| `recommended`       | Warns on import order issues                     |
| `strict`            | All rules set to error for production-ready code |
| `typescript`        | Optimized for TypeScript projects                |
| `module-resolution` | Focus on import resolution                       |
| `import-style`      | Focus on import formatting                       |
| `esm`               | Enforce ES Modules only                          |
| `architecture`      | Clean architecture boundaries                    |
| `performance`       | Bundle optimization (barrel detection)           |
| `enterprise`        | Team boundaries & legacy import tracking         |
| `errors`            | Matches eslint-plugin-import errors preset       |
| `warnings`          | Matches eslint-plugin-import warnings preset     |

## 🔄 Parity with `eslint-plugin-import`
| Rule      | Original Plugin                                                                                                                                                                                                    | Status       | Notes                    |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- | :----------------------- |
| All Rules | [`eslint-plugin-import`](https://www.npmjs.com/package/eslint-plugin-import) [![npm](https://img.shields.io/npm/v/eslint-plugin-import.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import) | ✅ Supported | Full drop-in replacement |

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 🧠 | **AI-Analyzed**: This rule has been analyzed by AI and has optimized error messages. |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [consistent-type-specifier-style](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/consistent-type-specifier-style) |  |  |  | Enforce or ban the use of inline type-only markers for named imports |  |  |  |  |  |  |
| [default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/default) |  |  |  | Ensure a default export is present, given a default import |  | 💼 |  |  |  |  |
| [dynamic-import-chunkname](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/dynamic-import-chunkname) |  |  |  | Enforce a leading comment with the webpackChunkName for dynamic imports |  |  |  |  |  |  |
| [enforce-dependency-direction](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-dependency-direction) |  |  |  | Ensures dependencies flow in the correct architectural direction |  |  |  |  |  |  |
| [enforce-import-order](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-import-order) |  |  |  | Enforces a specific order for import statements |  |  |  |  |  |  |
| [enforce-team-boundaries](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-team-boundaries) |  |  |  | Prevent unauthorized cross-team imports in large codebases |  |  |  |  |  |  |
| [export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/export) |  |  |  | Forbid any invalid exports, i.e. re-export of the same name |  | 💼 |  |  |  |  |
| [exports-last](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/exports-last) |  |  |  | Ensure all exports appear after other statements |  |  |  |  |  |  |
| [extensions](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/extensions) |  |  |  | Ensure consistent use of file extensions in imports |  |  |  |  |  |  |
| [first](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/first) |  |  |  | Ensure all imports appear before other statements |  |  | ⚠️ |  |  |  |
| [group-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/group-exports) |  |  |  | Prefer named exports to be grouped together in a single export declaration |  |  |  |  |  |  |
| [max-dependencies](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/max-dependencies) |  |  |  | Enforce the maximum number of dependencies a module can have |  |  |  |  |  |  |
| [named](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/named) |  |  |  | Ensure named imports correspond to a named export in the remote file |  | 💼 |  |  |  |  |
| [namespace](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/namespace) |  |  |  | Ensure imported namespaces contain dereferenced properties as they are dereferenced |  |  | ⚠️ |  |  |  |
| [newline-after-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/newline-after-import) |  |  |  | Enforce a newline after import statements |  |  | ⚠️ |  |  |  |
| [no-absolute-path](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-absolute-path) |  |  |  | Forbid import of modules using absolute paths |  |  |  |  |  |  |
| [no-amd](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-amd) |  |  |  | Prevents AMD require/define calls |  |  | ⚠️ |  |  |  |
| [no-anonymous-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-anonymous-default-export) |  |  |  | Forbid anonymous values as default exports |  |  |  |  |  |  |
| [no-barrel-file](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-barrel-file) |  |  |  | Disallow barrel files that harm build performance and tree-shaking efficiency |  |  |  |  |  |  |
| [no-barrel-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-barrel-import) |  |  |  | Disallow imports from barrel files to improve build performance and tree-shaking |  |  |  |  |  |  |
| [no-commonjs](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-commonjs) |  |  |  | Prevents CommonJS require/module.exports |  |  |  |  |  |  |
| [no-cross-domain-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-cross-domain-imports) |  |  |  | Prevents imports across domain/feature boundaries |  |  |  |  |  |  |
| [no-cycle](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-cycle) |  |  |  | Detect circular dependencies that cause bundle memory bloat and initialization issues |  | 💼 |  |  |  |  |
| [no-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-default-export) |  |  |  | Prevents default exports |  |  |  |  |  |  |
| [no-deprecated](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-deprecated) |  |  |  | Forbid imported names marked with @deprecated documentation tag |  |  |  |  |  |  |
| [no-duplicates](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-duplicates) |  |  |  | Reports duplicate imports |  | 💼 |  |  |  |  |
| [no-dynamic-require](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-dynamic-require) |  |  |  | Forbid require() calls with expressions |  |  |  |  |  |  |
| [no-empty-named-blocks](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-empty-named-blocks) |  |  |  | Forbid empty named import blocks |  |  | ⚠️ |  |  |  |
| [no-extraneous-dependencies](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-extraneous-dependencies) |  |  |  | Forbid the use of extraneous packages not listed in package.json |  |  | ⚠️ |  |  |  |
| [no-full-package-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-full-package-import) |  |  |  | Disallow full package imports from known large packages that prevent tree-shaking |  |  |  |  |  |  |
| [no-import-module-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-import-module-exports) |  |  |  | Forbid import statements with CommonJS module.exports |  |  |  |  |  |  |
| [no-internal-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-internal-modules) |  |  |  | Forbid importing the submodules of other modules |  |  |  |  |  |  |
| [no-legacy-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-legacy-imports) |  |  |  | Detect imports from deprecated internal paths and suggest alternatives |  |  |  |  |  |  |
| [no-mutable-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-mutable-exports) |  |  |  | Forbid the use of mutable exports with `var` or `let` |  |  |  |  |  |  |
| [no-named-as-default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-as-default) |  |  |  | Forbid use of exported name as identifier of default export |  |  | ⚠️ |  |  |  |
| [no-named-as-default-member](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-as-default-member) |  |  |  | Forbid use of exported name as property of default export |  |  | ⚠️ |  |  |  |
| [no-named-default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-default) |  |  |  | Forbid named default exports |  |  |  |  |  |  |
| [no-named-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-export) |  |  |  | Prevents named exports |  |  |  |  |  |  |
| [no-namespace](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-namespace) |  |  |  | Namespace imports are not recommended |  |  |  |  |  |  |
| [no-nodejs-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-nodejs-modules) |  |  |  | Prevents Node.js builtin imports |  |  |  |  |  |  |
| [no-relative-packages](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-relative-packages) |  |  |  | Forbid importing packages through relative paths |  |  |  |  |  |  |
| [no-relative-parent-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-relative-parent-imports) |  |  |  | Prevents ../ imports |  |  |  |  |  |  |
| [no-restricted-paths](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-restricted-paths) |  |  |  | Enforce which files can be imported in a given folder |  |  |  |  |  |  |
| [no-self-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-self-import) |  |  |  | Forbid a module from importing itself |  | 💼 |  |  |  |  |
| [no-unassigned-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unassigned-import) |  |  |  | Prevents unassigned imports |  |  |  |  |  |  |
| [no-unresolved](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unresolved) |  |  |  | Ensures imports point to resolvable modules |  | 💼 |  |  |  |  |
| [no-unused-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unused-modules) |  |  |  | Forbid modules without exports |  |  |  |  |  |  |
| [no-useless-path-segments](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-useless-path-segments) |  |  |  | Forbid unnecessary path segments in import and require statements |  |  |  |  |  |  |
| [prefer-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-default-export) |  |  |  | Prefer a default export if module exports a single name |  |  |  |  |  |  |
| [prefer-direct-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-direct-import) |  |  |  | Prefer direct imports over barrel imports for better tree-shaking and build performance |  |  |  |  |  |  |
| [prefer-modern-api](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-modern-api) |  |  |  | Suggest modern replacements for deprecated or outdated libraries |  |  |  |  |  |  |
| [prefer-node-protocol](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-node-protocol) |  |  |  | Prefer using the node: protocol when importing Node.js builtin modules |  |  |  |  |  |  |
| [prefer-tree-shakeable-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-tree-shakeable-imports) |  |  |  | Prefer import patterns that enable effective tree-shaking |  |  |  |  |  |  |
| [require-import-approval](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/require-import-approval) |  |  |  | Enforce explicit approval for high-risk package imports |  |  |  |  |  |  |
| [unambiguous](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/unambiguous) |  |  |  | Forbid potentially ambiguous parse goal (script vs. module) |  |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-import-next"><img src="https://eslint.interlace.tools/images/og-import-next.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>