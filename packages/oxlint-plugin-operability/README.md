<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-operability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Operability rules — observability hooks, structured logging, and runtime resilience.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-operability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-operability" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-operability.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-operability" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-operability" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-operability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-operability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-operability` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability). It carries the same rules under the same IDs (`operability/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

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

## Covered natively by oxlint

oxlint already ships 1 of these 6 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                   | oxlint built-in           |
| :---------------------------- | :------------------------ |
| `operability/no-process-exit` | `unicorn/no-process-exit` |

What this package adds to oxlint is the other 5: every rule in the table below that is not listed here.

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
npm install oxlint-plugin-operability --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-operability'],
    rules: {
      'operability/no-debug-code-in-production': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-operability"],
  "rules": {
    "operability/no-debug-code-in-production": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below), minus the ones oxlint already ships natively.

### ESLint

Install [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                         |   CWE   |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-console-log](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/no-console-log?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability)                           | CWE-532 |          |      | Disallow console.log with configurable remediation strategies and LLM-optimized output. This rule is part o… | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-debug-code-in-production](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/no-debug-code-in-production?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability) | CWE-489 |          |      | Detects debug code that should not be present in production builds.                                          | 🟢  | 💼  |     |     | 💡  |     |
| [no-process-exit](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/no-process-exit?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability)                         |         |          |      | Prevents direct process.exit() calls to encourage graceful shutdown patterns. This rule is part of eslint-p… | 🟢  |     |     |     | 💡  |     |
| [no-verbose-error-messages](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/no-verbose-error-messages?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability)     | CWE-209 | A01:2021 |      | Prevent exposing stack traces to users in API responses                                                      | 🟢  |     | ⚠️  |     |     |     |
| [require-code-minification](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/require-code-minification?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability)     | CWE-656 |          |      | Require minification configuration in build tools                                                            | 🟢  |     |     |     |     |     |
| [require-data-minimization](https://eslint.interlace.tools/docs/quality/plugin-operability/rules/require-data-minimization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability)     | CWE-213 |          |      | Identifies excessive data collection patterns that violate privacy principles                                | 🟢  |     |     |     | 💡  |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-operability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability"><img src="https://eslint.interlace.tools/images/og-operability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-operability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
