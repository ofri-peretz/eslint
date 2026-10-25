<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Reliability rules for defensive programming, error handling, and async correctness.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-reliability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-reliability" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-reliability.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-reliability" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-reliability" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-reliability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-reliability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-reliability` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability). It carries the same rules under the same IDs (`reliability/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

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

## Covered natively by oxlint

oxlint already ships 2 of these 9 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                    | oxlint built-in           |
| :----------------------------- | :------------------------ |
| `reliability/error-message`    | `unicorn/error-message`   |
| `reliability/no-await-in-loop` | `eslint/no-await-in-loop` |

What this package adds to oxlint is the other 7: every rule in the table below that is not listed here.

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code _does_, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

## Getting Started

```bash
npm install oxlint-plugin-reliability --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-reliability'],
    rules: {
      'reliability/no-silent-errors': 'error',
      'reliability/require-network-timeout': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-reliability"],
  "rules": {
    "reliability/no-silent-errors": "error",
    "reliability/require-network-timeout": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below), minus the ones oxlint already ships natively.

### ESLint

Install [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) instead. It has the same rules, plus presets for ESLint's flat config.

## 📦 Compatibility

| Package | Version                                                          |
| :------ | :--------------------------------------------------------------- |
| oxlint  | verified on `1.88.0`: CI loads every rule ID through `jsPlugins` |
| Vite+   | `lint.jsPlugins` in `vite.config.ts`                             |
| Node.js | `>=18.0.0`                                                       |

## Rules

**Legend**

| Icon | Description                                                               |
| :--: | :------------------------------------------------------------------------ |
|  💼  | **Recommended**: Included in the recommended preset.                      |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                             |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option.        |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                       |
|  🚫  | **Deprecated**: This rule is deprecated.                                  |
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.                |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it.        |

| Rule                                                                                                                                                                                                               |   CWE    | OWASP | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [error-message](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/error-message?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)                                   |          |       |      | Enforce providing a message when creating built-in Error objects for better debugging. This rule is part of… | 🟢  |     |     |     | 💡  |     |
| [no-await-in-loop](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-await-in-loop?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)                             |          |       |      | Disallow await inside loops without considering concurrency implications                                     | 🟢  |     |     |     | 💡  |     |
| [no-jsdoc-terminator-in-example](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-jsdoc-terminator-in-example?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability) |          |       |      | Detect `*/` sequences inside JSDoc `@example` blocks that prematurely close the JSDoc comment.               | 🟢  |     |     |     | 💡  |     |
| [no-missing-error-context](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-error-context?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)             |          |       |      | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto-fix capabilities.              | 🟢  |     |     |     | 💡  |     |
| [no-missing-null-checks](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-missing-null-checks?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)                 | CWE-476  |       |      | ESLint Rule: no-missing-null-checks with LLM-optimized suggestions and auto-fix capabilities.                | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-silent-errors](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-silent-errors?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)                             |          |       |      | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix capabilities.                      | 🟢  | 💼  |     |     | 💡  |     |
| [no-unhandled-promise](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unhandled-promise?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)                     | CWE-1024 |       |      | Disallow unhandled Promise rejections with LLM-optimized suggestions for proper async error handling. This…  | 🟢  |     |     |     | 💡  |     |
| [no-unsafe-type-narrowing](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/no-unsafe-type-narrowing?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)             |          |       |      | ESLint Rule: no-unsafe-type-narrowing with LLM-optimized suggestions and auto-fix capabilities.              | 🟢  |     |     |     | 💡  |     |
| [require-network-timeout](https://eslint.interlace.tools/docs/quality/plugin-reliability/rules/require-network-timeout?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability)               |          |       |      | Require timeout configuration for network requests. This rule is part of eslint-plugin-reliability and prov… | 🟢  | 💼  |     |     | 💡  |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability"><img src="https://eslint.interlace.tools/images/og-reliability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
