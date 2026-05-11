<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Reliability rules for defensive programming, error handling, and async correctness.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-reliability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-reliability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=reliability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=reliability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Reliability rules for defensive programming, error handling, and async correctness.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-reliability), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-reliability), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-reliability) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-reliability)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-reliability), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-reliability)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-reliability --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                   |
| :------------ | :-------------------------------------------- |
| `recommended` | Balanced reliability checks for most projects |

---

## 🏢 Usage Example
```js
// eslint.config.js
import reliability from 'eslint-plugin-reliability';

export default [reliability.configs.recommended];
```

---

## Why These Rules?
### `no-silent-errors`

Empty catch blocks hide errors, making debugging impossible.

```ts
// ❌ Bad: Silent error swallowing
try {
  await processPayment(order);
} catch (e) {
  // Error is silently ignored!
}

// ✅ Good: Handle or log the error
try {
  await processPayment(order);
} catch (e) {
  logger.error('Payment processing failed', { orderId: order.id, error: e });
  throw new PaymentError('Payment failed', { cause: e });
}
```

### `no-missing-null-checks`

Catches potential `null` or `undefined` dereferences.

```ts
// ❌ Bad: Potential runtime error
function greet(user: User | null) {
  return `Hello, ${user.name}`; // TypeError if user is null!
}

// ✅ Good: Null-safe access
function greet(user: User | null) {
  return user ? `Hello, ${user.name}` : 'Hello, guest';
}
```

### `require-network-timeout`

Network requests without timeouts can hang indefinitely.

```ts
// ❌ Bad: No timeout, can hang forever
const response = await fetch('/api/data');

// ✅ Good: Request with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const response = await fetch('/api/data', {
  signal: controller.signal,
});
clearTimeout(timeoutId);
```

### `no-await-in-loop`

Sequential awaits in loops cause N+1 performance issues.

```ts
// ❌ Bad: Sequential requests (slow)
for (const id of userIds) {
  const user = await fetchUser(id); // N sequential requests
  results.push(user);
}

// ✅ Good: Parallel requests (fast)
const results = await Promise.all(userIds.map((id) => fetchUser(id)));
```

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
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [error-message](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/error-message) |  |  |  | Enforce providing a message when creating built-in Error objects for better debugging. This rule is part of… | 🟢 |  |  |  | 💡 |  |
| [no-await-in-loop](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-await-in-loop) |  |  |  | Disallow await inside loops without considering concurrency implications | 🟢 |  |  |  | 💡 |  |
| [no-jsdoc-terminator-in-example](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-jsdoc-terminator-in-example) |  |  |  | Detect `*/` sequences inside JSDoc `@example` blocks that prematurely close the JSDoc comment. | 🟢 |  |  |  | 💡 |  |
| [no-missing-error-context](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-error-context) |  |  |  | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [no-missing-null-checks](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-null-checks) | CWE-476 |  |  | ESLint Rule: no-missing-null-checks with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-silent-errors](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-silent-errors) |  |  |  | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-unhandled-promise](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unhandled-promise) | CWE-1024 |  |  | Disallow unhandled Promise rejections with LLM-optimized suggestions for proper async error handling. This… | 🟢 |  |  |  | 💡 |  |
| [no-unsafe-type-narrowing](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unsafe-type-narrowing) |  |  |  | ESLint Rule: no-unsafe-type-narrowing with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [require-network-timeout](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/require-network-timeout) |  |  |  | Require timeout configuration for network requests. This rule is part of eslint-plugin-reliability and prov… | 🟢 | 💼 |  |  | 💡 |  |
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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability"><img src="https://eslint.interlace.tools/images/og-reliability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>