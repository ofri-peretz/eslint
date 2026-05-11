<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications (Controllers, Providers, Decorators).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=nestjs-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=nestjs-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security rules tailored for NestJS applications (Controllers, Providers, Decorators).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-nestjs-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-nestjs-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-nestjs-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-nestjs-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-nestjs-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-nestjs-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                              |
| :------------ | :------------------------------------------------------- |
| `recommended` | Enables all security rules with sensible severity levels |
| `strict`      | All security rules set to 'error' for maximum protection |

## 📚 Supported Libraries
| Library             | npm                                                                                                                             | Downloads                                                                                                                              | Detection          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `@nestjs/common`    | [![npm](https://img.shields.io/npm/v/@nestjs/common.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/common)       | [![downloads](https://img.shields.io/npm/dt/@nestjs/common.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/common)       | Decorators, Guards |
| `@nestjs/core`      | [![npm](https://img.shields.io/npm/v/@nestjs/core.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/core)           | [![downloads](https://img.shields.io/npm/dt/@nestjs/core.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/core)           | App Config         |
| `class-validator`   | [![npm](https://img.shields.io/npm/v/class-validator.svg?style=flat-square)](https://www.npmjs.com/package/class-validator)     | [![downloads](https://img.shields.io/npm/dt/class-validator.svg?style=flat-square)](https://www.npmjs.com/package/class-validator)     | DTO Validation     |
| `@nestjs/throttler` | [![npm](https://img.shields.io/npm/v/@nestjs/throttler.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/throttler) | [![downloads](https://img.shields.io/npm/dt/@nestjs/throttler.svg?style=flat-square)](https://www.npmjs.com/package/@nestjs/throttler) | Rate Limiting      |

---

## ⚠️ Global Configuration Handling
> **Static Analysis Limitation:** ESLint analyzes files independently. It cannot detect cross-file configurations like `app.useGlobalGuards()` in `main.ts` while linting `users.controller.ts`.

### Understanding the Problem

NestJS supports two security configuration approaches:

| Approach             | Example                                           | ESLint Can See? |
| -------------------- | ------------------------------------------------- | :-------------: |
| **Per-Controller**   | `@UseGuards(AuthGuard)` on class                  |       ✅        |
| **Per-Method**       | `@UseGuards(AuthGuard)` on method                 |       ✅        |
| **Global (main.ts)** | `app.useGlobalGuards(new AuthGuard())`            |       ❌        |
| **Global (Module)**  | `ThrottlerModule.forRoot({ ttl: 60, limit: 10 })` |       ❌        |

### Solution: `assumeGlobal*` Options

For teams using **global configuration**, set `assumeGlobal*: true` to disable per-file checks:

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  {
    ...nestjsSecurity.configs.recommended,
    rules: {
      // Tell ESLint: "We have app.useGlobalGuards() in main.ts"
      'nestjs-security/require-guards': ['warn', { assumeGlobalGuards: true }],

      // Tell ESLint: "We have app.useGlobalPipes(new ValidationPipe()) in main.ts"
      'nestjs-security/no-missing-validation-pipe': [
        'warn',
        { assumeGlobalPipes: true },
      ],

      // Tell ESLint: "We have ThrottlerModule.forRoot() in app.module.ts"
      'nestjs-security/require-throttler': [
        'warn',
        { assumeGlobalThrottler: true },
      ],
    },
  },
];
```

### Alternative: Use Skip Decorators

The rules recognize common "bypass" decorators for intentionally unprotected endpoints:

```typescript
// These bypass require-guards
@Public()        // nestjs-passport pattern
@SkipAuth()      // common custom decorator
@AllowAnonymous() // alternative naming
@NoAuth()        // alternative naming

// These bypass require-throttler
@SkipThrottle()  // @nestjs/throttler built-in
```

### 🔮 Future: Cross-File Global Detection (Planned)

We're planning dedicated rules to **verify** global configuration exists:

- `require-global-guards` → Ensures `main.ts` contains `app.useGlobalGuards()`
- `require-global-validation-pipe` → Ensures `main.ts` contains `app.useGlobalPipes()`
- `require-global-throttler` → Ensures `app.module.ts` imports `ThrottlerModule`

This will enable a "trust but verify" approach for teams using global configuration.

---

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
| 🧠 | **AI-Analyzed**: This rule has been analyzed by AI and has optimized error messages. |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-exposed-debug-endpoints) | CWE-489 |  |  | Detect debug endpoints without auth in NestJS applications |  |  |  |  |  |  |
| [no-exposed-private-fields](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-exposed-private-fields) | CWE-200 | A01:2025 |  | Detects sensitive fields not excluded from serialization |  |  |  |  |  |  |
| [no-missing-validation-pipe](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-missing-validation-pipe) | CWE-20 | A03:2025 |  | Requires ValidationPipe for DTO input parameters |  |  |  |  |  |  |
| [require-class-validator](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-class-validator) | CWE-20 | A03:2025 |  | Requires class-validator decorators on DTO properties |  |  |  |  |  |  |
| [require-guards](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-guards) | CWE-284 | A01:2025 |  | Requires @UseGuards decorator on controllers or route handlers |  | 💼 |  |  |  |  |
| [require-throttler](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-throttler) | CWE-770 | A05:2025 |  | Requires ThrottlerGuard or @Throttle decorator for rate limiting |  |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security"><img src="https://eslint.interlace.tools/images/og-nestjs-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>