<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Error handling, null safety, and runtime reliability rules for robust applications.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-reliability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-reliability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=reliability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=reliability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin enforces reliable code patterns by detecting unhandled promises, silent error swallowing, missing null checks, and network timeouts. It helps teams build applications that fail gracefully and recover predictably.

## Philosophy

**Interlace** fosters **strength through integration**. Reliability isn't optional — it's foundational. These rules catch common runtime failure patterns before they cause incidents in production.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/reliability), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/reliability), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/reliability) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/reliability)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/reliability), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/reliability)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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

### Error Handling

| Rule                                                                 | Description                                   | 💼  | ⚠️  |
| :------------------------------------------------------------------- | :-------------------------------------------- | :-: | :-: |
| [no-unhandled-promise](./docs/rules/no-unhandled-promise.md)         | Detect unhandled promise rejections           |     |     |
| [no-silent-errors](./docs/rules/no-silent-errors.md)                 | Detect empty catch blocks that swallow errors | 💼  | ⚠️  |
| [no-missing-error-context](./docs/rules/no-missing-error-context.md) | Require error context when re-throwing        |     |     |
| [error-message](./docs/rules/error-message.md)                       | Require meaningful error messages             |     |     |

### Runtime Safety

| Rule                                                                 | Description                                    | 💼  | ⚠️  |
| :------------------------------------------------------------------- | :--------------------------------------------- | :-: | :-: |
| [no-missing-null-checks](./docs/rules/no-missing-null-checks.md)     | Detect potential null/undefined dereferences   | 💼  | ⚠️  |
| [no-unsafe-type-narrowing](./docs/rules/no-unsafe-type-narrowing.md) | Detect unsafe type narrowing patterns          |     |     |
| [require-network-timeout](./docs/rules/require-network-timeout.md)   | Require timeouts on network requests           | 💼  |     |
| [no-await-in-loop](./docs/rules/no-await-in-loop.md)                 | Detect sequential await in loops (performance) |     |     |

**Legend**: 💼 Recommended | ⚠️ Warns (not error)

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native quality plugins with LLM-optimized error messages:

| Plugin                                                                                         |                                                                            Downloads                                                                             | Description                         |
| :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------- |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability)         |     [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability)     | Production readiness & debug code   |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive complexity & code quality |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)     |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)  | Security best practices & OWASP     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/reliability"><img src="https://eslint.interlace.tools/images/og-quality.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
