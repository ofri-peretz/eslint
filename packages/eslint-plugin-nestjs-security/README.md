# eslint-plugin-nestjs-security

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>

[![npm version](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=nestjs-security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=nestjs-security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/nestjs-security](https://eslint.interlace.tools/docs/nestjs-security)
>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Security rules tailored for NestJS applications.

## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

Security rules tailored for NestJS applications.

## Description

## Getting Started

```bash
npm install eslint-plugin-nestjs-security --save-dev
```

---

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|   Rule                                                        | General |  General  |   Tag       |     CWE     |    OWASP    |    CVSS     |   Description   |                 💼                 |     ⚠️      |   🔧    |   💡    |                     🚫                      |
|   [require-guards](#require-guards)                           | General |  General  |   General   |   General   |   General   |   General   |   General       |   Authorization & Access Control   |   CWE-284   |   A01   |   9.8   |      Require @UseGuards on controllers      |   💼    |   💡    |
|   [no-exposed-private-fields](#no-exposed-private-fields)     | General |  General  |   General   |   General   |   General   |   General   |   General       |   Authorization & Access Control   |   CWE-200   |   A01   |   7.5   |   Detect exposed sensitive fields in DTOs   |   💼    |   💡    |
|   [no-missing-validation-pipe](#no-missing-validation-pipe)   | General |  General  |   General   |   General   |   General   |   General   |   General       |          Input Validation          |   CWE-20    |   A03   |   8.6   |       Require ValidationPipe for DTOs       |   💼    |   💡    |
|   [require-class-validator](#require-class-validator)         | General |  General  |   General   |   General   |   General   |   General   |   General       |          Input Validation          |   CWE-20    |   A03   |   7.5   |     Require class-validator decorators      |   ⚠️    |   💡    |
|   [require-throttler](#require-throttler)                     | General |  General  |   General   |   General   |   General   |   General   |   General       |        Rate Limiting & DoS         |   CWE-770   |   A05   |   7.5   |      Require ThrottlerGuard/rate limit      |   ⚠️    |   💡    |

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  nestjsSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [nestjsSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **`recommended`** | Balanced security for NestJS projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                     |

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

### Configuration Matrix

| Rule                         | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------- | :-: | :---: | :--: | :---------- | :-: | :-: | :-: | :-: | :-: |
| `require-guards`             |     |       |      |             |     |     |     |     |     |
| `no-missing-validation-pipe` |     |       |      |             |     |     |     |     |     |
| `require-throttler`          |     |       |      |             |     |     |     |     |     |
| `require-class-validator`    |     |       |      |             |     |     |     |     |     |
| `no-exposed-private-fields`  |     |       |      |             |     |     |     |     |     |

### 🔮 Future: Cross-File Global Detection (Planned)

We're planning dedicated rules to **verify** global configuration exists:

- `require-global-guards` → Ensures `main.ts` contains `app.useGlobalGuards()`
- `require-global-validation-pipe` → Ensures `main.ts` contains `app.useGlobalPipes()`
- `require-global-throttler` → Ensures `app.module.ts` imports `ThrottlerModule`

This will enable a "trust but verify" approach for teams using global configuration.

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  // Baseline for all NestJS apps
  nestjsSecurity.configs.recommended,

  // Strict mode for payment/auth services
  {
    files: ['src/auth/**', 'src/payments/**'],
    ...nestjsSecurity.configs.strict,
  },
];
```

---

## 🤖 LLM & AI Integration

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

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Downloads | Description |
| :--------------------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |           |             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |           |             |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |           |             |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |           |             |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |           |             |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |           |             |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |           |             |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |           |             |

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/nestjs-security"><img src="https://eslint.interlace.tools/images/og-backend.png" alt="ESLint Interlace Plugin" width="100%" /></a>