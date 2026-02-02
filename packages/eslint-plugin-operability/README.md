<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Production readiness rules for debug code, logging, and operational hygiene.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-operability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-operability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=operability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=operability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin enforces production-ready code practices by detecting debug statements, verbose error messages, and other patterns that should not ship to production. It helps teams maintain operational hygiene and prevent accidental exposure of sensitive information.

## Philosophy

**Interlace** fosters **strength through integration**. Code that works in development isn't always production-ready. These rules catch common operability issues before they reach production, protecting both your users and your infrastructure.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/operability), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/operability), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/operability) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/operability)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/operability), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/operability)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact issue via structured context
- Apply the correct fix using guidance
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

## Rules

| Rule                                                                       | Description                                   | 💼  | ⚠️  |
| :------------------------------------------------------------------------- | :-------------------------------------------- | :-: | :-: |
| [no-console-log](./docs/rules/no-console-log.md)                           | Disallow `console.log` in production code     | 💼  | ⚠️  |
| [no-process-exit](./docs/rules/no-process-exit.md)                         | Disallow `process.exit()` in library code     |     |     |
| [no-debug-code-in-production](./docs/rules/no-debug-code-in-production.md) | Detect debug statements and debugger keywords | 💼  |     |
| [no-verbose-error-messages](./docs/rules/no-verbose-error-messages.md)     | Prevent overly detailed error messages        | 💼  | ⚠️  |
| [require-code-minification](./docs/rules/require-code-minification.md)     | Detect patterns that prevent minification     |     |     |
| [require-data-minimization](./docs/rules/require-data-minimization.md)     | Detect excessive data exposure in responses   |     |     |

**Legend**: 💼 Recommended | ⚠️ Warns (not error)

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native quality plugins with LLM-optimized error messages:

| Plugin                                                                                         |                                                                            Downloads                                                                             | Description                         |
| :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------- |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability)     | Error handling & null safety        |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive complexity & code quality |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)     |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)  | Security best practices & OWASP     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/operability"><img src="https://eslint.interlace.tools/images/og-quality.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
