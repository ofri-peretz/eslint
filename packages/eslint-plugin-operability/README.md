<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-operability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-operability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-operability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-operability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security-focused ESLint plugin.
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-operability), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-operability), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-operability) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-operability)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-operability), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-operability)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-operability --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                     |
| :------------ | :---------------------------------------------- |
| `recommended` | Balanced operability checks for production code |

---

## 🏢 Usage Example
```js
// eslint.config.js
import operability from 'eslint-plugin-operability';

export default [
  operability.configs.recommended,

  // Be extra strict in production code
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'operability/no-console-log': 'error',
    },
  },
];
```

---

## Why These Rules?
### `no-console-log`

`console.log` statements are for debugging and shouldn't ship to production.

```ts
// ❌ Bad: Debug logging in production
function processPayment(card: Card) {
  console.log('Processing payment:', card); // Exposes sensitive data!
  return paymentService.charge(card);
}

// ✅ Good: Use proper logging
function processPayment(card: Card) {
  logger.info('Processing payment', { cardLast4: card.last4 });
  return paymentService.charge(card);
}
```

### `no-debug-code-in-production`

Catches `debugger` statements and debug-only code paths.

```ts
// ❌ Bad: Debugger statement left in code
function calculateTotal(items: Item[]) {
  debugger; // Will pause execution in production!
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good: No debug statements
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### `no-verbose-error-messages`

Prevents detailed error messages that could expose system internals.

```ts
// ❌ Bad: Verbose error exposes internals (CWE-209)
throw new Error(
  `Database connection failed at ${host}:${port} with user ${dbUser}`,
);

// ✅ Good: Generic error with internal logging
logger.error('Database connection failed', { host, port, user: dbUser });
throw new Error('Service temporarily unavailable');
```

---

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [operability](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/operability) |  |  |  | Enforce operability |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-operability"><img src="https://eslint.interlace.tools/images/og-operability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>