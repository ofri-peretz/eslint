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

This plugin represents the next evolution of import validation, offering advanced features like granular import sorting and strictly enforced architectural boundaries. It is designed to modernize your development workflow by providing tools that prevent circular dependencies and enforce clean module structures. By integrating these rules, you can maintain a scalable and organized codebase that is easy to navigate and refactor.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/import-next), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/import-next), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/import-next) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/import-next)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/import-next), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/import-next)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-import-next --save-dev
```

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

Unlike legacy plugins, we analyze the _type_ of issue and suggest the correct fix:

```bash
# Type-only Cycle
🧩 CWE-407 | Circular Dependency (Types Only)
   Path: auth.ts → user.ts → auth.ts
   Fix: Extract shared types to 'types.ts' or use 'import type'

# Hard Dependency Cycle
🏗️ CWE-407 | Circular Dependency (Runtime)
   Path: ServiceA → ServiceB → ServiceA
   Fix: Use Dependency Injection or split into Core/Extended modules

# Deep Cycle (previously undetectable)
⚠️ CWE-407 | Deep Circular Dependency (depth: 7)
   Path: A → B → C → D → E → F → G → A
   Impact: May cause Vite/Next.js build failures
   Fix: Introduce an abstraction layer between A and G
```

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

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                      |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                       | Pattern/Concept  | Description                                         | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------- | :--------------- | :-------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [`no-unresolved`](https://eslint.interlace.tools/docs/import-next/rules/no-unresolved)                                     | Static Analysis  | Ensure imports resolve                              | 💼  |     |     | 💡  |     |
| [`named`](https://eslint.interlace.tools/docs/import-next/rules/named)                                                     | Static Analysis  | Ensure named imports exist                          | 💼  |     |     |     |     |
| [`default`](https://eslint.interlace.tools/docs/import-next/rules/default)                                                 | Static Analysis  | Ensure default export exists                        | 💼  |     |     |     |     |
| [`namespace`](https://eslint.interlace.tools/docs/import-next/rules/namespace)                                             | Static Analysis  | Ensure namespace properties exist                   | 💼  |     |     |     |     |
| [`no-absolute-path`](https://eslint.interlace.tools/docs/import-next/rules/no-absolute-path)                               | Static Analysis  | Forbid absolute paths                               |     |     | 🔧  |     |     |
| [`no-dynamic-require`](https://eslint.interlace.tools/docs/import-next/rules/no-dynamic-require)                           | Static Analysis  | Forbid dynamic require()                            |     |     |     |     |     |
| [`no-internal-modules`](https://eslint.interlace.tools/docs/import-next/rules/no-internal-modules)                         | Static Analysis  | Enforce entry points only                           |     |     |     | 💡  |     |
| [`no-relative-packages`](https://eslint.interlace.tools/docs/import-next/rules/no-relative-packages)                       | Static Analysis  | Use package names                                   |     |     | 🔧  |     |     |
| [`no-relative-parent-imports`](https://eslint.interlace.tools/docs/import-next/rules/no-relative-parent-imports)           | Static Analysis  | Prevent `../` imports                               |     |     |     |     |     |
| [`no-self-import`](https://eslint.interlace.tools/docs/import-next/rules/no-self-import)                                   | Static Analysis  | Prevent self-imports                                | 💼  |     |     | 💡  |     |
| [`no-cycle`](https://eslint.interlace.tools/docs/import-next/rules/no-cycle)                                               | Static Analysis  | **100x faster** cycle detection                     | 💼  |     |     | 💡  |     |
| [`no-useless-path-segments`](https://eslint.interlace.tools/docs/import-next/rules/no-useless-path-segments)               | Static Analysis  | Simplify paths                                      |     |     | 🔧  |     |     |
| [`no-restricted-paths`](https://eslint.interlace.tools/docs/import-next/rules/no-restricted-paths)                         | Static Analysis  | Custom path restrictions                            |     |     |     |     |     |
| [`export`](https://eslint.interlace.tools/docs/import-next/rules/export)                                                   | Helpful Warnings | Forbid duplicate exports                            | 💼  |     |     |     |     |
| [`no-deprecated`](https://eslint.interlace.tools/docs/import-next/rules/no-deprecated)                                     | Helpful Warnings | Warn on `@deprecated` imports                       |     |     |     |     |     |
| [`no-empty-named-blocks`](https://eslint.interlace.tools/docs/import-next/rules/no-empty-named-blocks)                     | Helpful Warnings | Forbid empty `{}` imports                           |     |     | 🔧  | 💡  |     |
| [`no-extraneous-dependencies`](https://eslint.interlace.tools/docs/import-next/rules/no-extraneous-dependencies)           | Helpful Warnings | Prevent unlisted deps                               | 💼  |     |     | 💡  |     |
| [`no-mutable-exports`](https://eslint.interlace.tools/docs/import-next/rules/no-mutable-exports)                           | Helpful Warnings | Forbid `let`/`var` exports                          |     |     |     |     |     |
| [`no-named-as-default`](https://eslint.interlace.tools/docs/import-next/rules/no-named-as-default)                         | Helpful Warnings | Warn on default shadowing                           | 💼  |     |     |     |     |
| [`no-named-as-default-member`](https://eslint.interlace.tools/docs/import-next/rules/no-named-as-default-member)           | Helpful Warnings | Warn on property access                             | 💼  |     |     |     |     |
| [`no-unused-modules`](https://eslint.interlace.tools/docs/import-next/rules/no-unused-modules)                             | Helpful Warnings | Find dead code                                      |     |     |     | 💡  |     |
| [`no-amd`](https://eslint.interlace.tools/docs/import-next/rules/no-amd)                                                   | Module Systems   | Forbid AMD require/define                           |     |     |     |     |     |
| [`no-commonjs`](https://eslint.interlace.tools/docs/import-next/rules/no-commonjs)                                         | Module Systems   | Forbid CommonJS                                     |     |     |     |     |     |
| [`no-nodejs-modules`](https://eslint.interlace.tools/docs/import-next/rules/no-nodejs-modules)                             | Module Systems   | Forbid Node.js builtins                             |     |     |     |     |     |
| [`no-import-module-exports`](https://eslint.interlace.tools/docs/import-next/rules/no-import-module-exports)               | Module Systems   | No mixed ES/CJS                                     |     |     |     |     |     |
| [`unambiguous`](https://eslint.interlace.tools/docs/import-next/rules/unambiguous)                                         | Module Systems   | Warn on ambiguous modules                           |     |     |     |     |     |
| [`consistent-type-specifier-style`](https://eslint.interlace.tools/docs/import-next/rules/consistent-type-specifier-style) | Style Guide      | Type import style                                   |     |     | 🔧  |     |     |
| [`dynamic-import-chunkname`](https://eslint.interlace.tools/docs/import-next/rules/dynamic-import-chunkname)               | Style Guide      | Require webpack chunk names                         |     |     |     | 💡  |     |
| [`exports-last`](https://eslint.interlace.tools/docs/import-next/rules/exports-last)                                       | Style Guide      | Exports at end of file                              |     |     |     |     |     |
| [`extensions`](https://eslint.interlace.tools/docs/import-next/rules/extensions)                                           | Style Guide      | Enforce file extension usage                        |     |     |     |     |     |
| [`first`](https://eslint.interlace.tools/docs/import-next/rules/first)                                                     | Style Guide      | Imports must be first                               |     |     | 🔧  |     |     |
| [`group-exports`](https://eslint.interlace.tools/docs/import-next/rules/group-exports)                                     | Style Guide      | Group exports together                              |     |     |     |     |     |
| [`max-dependencies`](https://eslint.interlace.tools/docs/import-next/rules/max-dependencies)                               | Style Guide      | Limit module dependencies                           |     |     |     |     |     |
| [`newline-after-import`](https://eslint.interlace.tools/docs/import-next/rules/newline-after-import)                       | Style Guide      | Newline after imports                               |     |     | 🔧  |     |     |
| [`no-anonymous-default-export`](https://eslint.interlace.tools/docs/import-next/rules/no-anonymous-default-export)         | Style Guide      | Require named default exports                       |     |     |     |     |     |
| [`no-default-export`](https://eslint.interlace.tools/docs/import-next/rules/no-default-export)                             | Style Guide      | Forbid default exports                              |     |     |     | 💡  |     |
| [`no-duplicates`](https://eslint.interlace.tools/docs/import-next/rules/no-duplicates)                                     | Style Guide      | Merge duplicate imports                             | 💼  |     | 🔧  |     |     |
| [`no-named-default`](https://eslint.interlace.tools/docs/import-next/rules/no-named-default)                               | Style Guide      | Use default import syntax                           |     |     |     |     |     |
| [`no-named-export`](https://eslint.interlace.tools/docs/import-next/rules/no-named-export)                                 | Style Guide      | Forbid named exports                                |     |     |     |     |     |
| [`no-namespace`](https://eslint.interlace.tools/docs/import-next/rules/no-namespace)                                       | Style Guide      | Forbid `* as` imports                               |     |     |     |     |     |
| [`no-unassigned-import`](https://eslint.interlace.tools/docs/import-next/rules/no-unassigned-import)                       | Style Guide      | Forbid side-effect imports                          |     |     |     |     |     |
| [`order`](https://eslint.interlace.tools/docs/import-next/rules/order)                                                     | Style Guide      | Sort and group imports                              | 💼  |     | 🔧  |     |     |
| [`prefer-default-export`](https://eslint.interlace.tools/docs/import-next/rules/prefer-default-export)                     | Style Guide      | Prefer default for single exports                   |     |     |     |     |     |
| [`no-cross-domain-imports`](https://eslint.interlace.tools/docs/import-next/rules/no-cross-domain-imports)                 | Architecture     | Enforce clean architecture boundaries               |     |     |     |     |     |
| [`enforce-dependency-direction`](https://eslint.interlace.tools/docs/import-next/rules/enforce-dependency-direction)       | Architecture     | Enforce layered architecture (UI → Services → Data) |     |     |     |     |     |
| [`prefer-node-protocol`](https://eslint.interlace.tools/docs/import-next/rules/prefer-node-protocol)                       | Architecture     | Prefer `node:fs` over `fs`                          |     |     |     |     |     |
| [`no-barrel-file`](https://eslint.interlace.tools/docs/import-next/rules/no-barrel-file)                                   | Architecture     | Detect barrel files that harm build performance     |     |     |     |     |     |
| [`no-barrel-import`](https://eslint.interlace.tools/docs/import-next/rules/no-barrel-import)                               | Architecture     | Flag imports from barrel files                      |     |     |     |     |     |
| [`prefer-tree-shakeable-imports`](https://eslint.interlace.tools/docs/import-next/rules/prefer-tree-shakeable-imports)     | Architecture     | Enforce tree-shakeable import patterns              |     |     |     |     |     |
| [`prefer-direct-import`](https://eslint.interlace.tools/docs/import-next/rules/prefer-direct-import)                       | Architecture     | Suggest direct imports with autofix                 |     |     |     |     |     |
| [`no-full-package-import`](https://eslint.interlace.tools/docs/import-next/rules/no-full-package-import)                   | Architecture     | Block full imports from large packages              |     |     |     |     |     |
| [`enforce-team-boundaries`](https://eslint.interlace.tools/docs/import-next/rules/enforce-team-boundaries)                 | Architecture     | Prevent unauthorized cross-team imports             |     |     |     |     |     |
| [`no-legacy-imports`](https://eslint.interlace.tools/docs/import-next/rules/no-legacy-imports)                             | Architecture     | Detect deprecated imports with autofix              |     |     |     |     |     |

## 🔄 Compatibility Matrix

| Rule      | Original Plugin                                                                                                                                                                                                    | Status       | Notes                    |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- | :----------------------- |
| All Rules | [`eslint-plugin-import`](https://www.npmjs.com/package/eslint-plugin-import) [![npm](https://img.shields.io/npm/v/eslint-plugin-import.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import) | ✅ Supported | Full drop-in replacement |

---

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
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)     |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)    | MongoDB security best practices.           |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/import-next"><img src="https://eslint.interlace.tools/images/og-import-next.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
