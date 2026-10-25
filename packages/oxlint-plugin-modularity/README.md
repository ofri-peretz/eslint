<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modularity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Modularity rules — module boundaries, circular dependency detection, and layered architecture.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-modularity.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-modularity.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-modularity" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-modularity" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-modularity" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-modularity" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-modularity` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity). It carries the same rules under the same IDs (`modularity/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Why These Rules?

### `ddd-anemic-domain-model`

Detects domain entities that are just data containers without behavior — a common anti-pattern.

```ts
// ❌ Bad: Anemic model, no behavior
class Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
}

// ✅ Good: Rich domain model with behavior
class Order {
  id: string;
  private items: OrderItem[];
  private status: OrderStatus;

  addItem(item: OrderItem): void {
    /* ... */
  }
  submit(): void {
    /* ... */
  }
  cancel(reason: string): void {
    /* ... */
  }
}
```

### `ddd-value-object-immutability`

Value objects should be immutable. This rule catches mutable value objects.

```ts
// ❌ Bad: Mutable value object
class Money {
  amount: number; // Can be mutated!
}

// ✅ Good: Immutable value object
class Money {
  readonly amount: number;
  readonly currency: string;

  add(other: Money): Money {
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

### `no-external-api-calls-in-utils`

Utility modules should be pure functions without side effects like API calls.

```ts
// ❌ Bad: Utils with external dependencies
// src/utils/formatters.ts
import axios from 'axios';

export async function fetchAndFormat(id: string) {
  const data = await axios.get(`/api/${id}`); // External API call!
  return format(data);
}

// ✅ Good: Pure utility function
export function format(data: Data): FormattedData {
  return {/* pure transformation */};
}
```

---

## Covered natively by oxlint

oxlint already ships 1 of these 6 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                     | oxlint built-in             |
| :------------------------------ | :-------------------------- |
| `modularity/no-mutable-exports` | `import/no-mutable-exports` |

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
npm install oxlint-plugin-modularity --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-modularity'],
    rules: {
      'modularity/ddd-value-object-immutability': 'error',
      'modularity/enforce-rest-conventions': 'error',
      'modularity/no-external-api-calls-in-utils': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-modularity"],
  "rules": {
    "modularity/ddd-value-object-immutability": "error",
    "modularity/enforce-rest-conventions": "error",
    "modularity/no-external-api-calls-in-utils": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below), minus the ones oxlint already ships natively.

### ESLint

Install [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                             | CWE | OWASP | CVSS | Description                                                                                                 | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | :---: | :--: | :---------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [ddd-anemic-domain-model](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/ddd-anemic-domain-model?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity)               |     |       |      | Detects entities with only getters/setters and no business logic, enforcing the Rich Domain Model over the… | 🟢  |     | ⚠️  |     | 💡  |     |
| [ddd-value-object-immutability](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/ddd-value-object-immutability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity)   |     |       |      | ESLint Rule: ddd-value-object-immutability with LLM-optimized suggestions and auto-fix capabilities.        | 🟢  | 💼  |     |     | 💡  |     |
| [enforce-naming](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/enforce-naming?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity)                                 |     |       |      | Enforce domain-specific naming conventions with business context                                            | 🟢  |     | ⚠️  |     | 💡  |     |
| [enforce-rest-conventions](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/enforce-rest-conventions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity)             |     |       |      | ESLint Rule: enforce-rest-conventions with LLM-optimized suggestions and auto-fix capabilities.             | 🟢  | 💼  |     |     | 💡  |     |
| [no-external-api-calls-in-utils](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/no-external-api-calls-in-utils?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity) |     |       |      | ESLint Rule: no-external-api-calls-in-utils with LLM-optimized suggestions and auto-fix capabilities.       | 🟢  | 💼  |     |     | 💡  |     |
| [no-mutable-exports](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/no-mutable-exports?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity)                         |     |       |      | Disallow mutable let/var declarations on exported bindings                                                  | 🟢  |     | ⚠️  |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modularity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity"><img src="https://eslint.interlace.tools/images/og-modularity.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modularity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
