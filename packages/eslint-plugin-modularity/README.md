<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-modularity.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-modularity.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-modularity" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-modularity" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security-focused ESLint plugin.
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-modularity), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-modularity), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-modularity) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-modularity)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-modularity), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-modularity)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-modularity --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                |
| :------------ | :----------------------------------------- |
| `recommended` | Balanced DDD and architecture enforcement  |
| `strict`      | All rules as errors for strict enforcement |

---

## 🏢 Usage Example
```js
// eslint.config.js
import modularity from 'eslint-plugin-modularity';

export default [
  modularity.configs.recommended,

  // Apply strict DDD enforcement to domain layer
  {
    files: ['src/domain/**/*.ts'],
    ...modularity.configs.strict,
  },
];
```

---

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
  return {
    /* pure transformation */
  };
}
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
| [ddd-anemic-domain-model](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/ddd-anemic-domain-model) |  |  |  | ESLint rule documentation for ddd-anemic-domain-model |  |  |  |  |  |
| [ddd-value-object-immutability](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/ddd-value-object-immutability) |  |  |  | ESLint rule documentation for ddd-value-object-immutability |  |  |  |  |  |
| [enforce-naming](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/enforce-naming) |  |  |  | ESLint rule documentation for enforce-naming |  |  |  |  |  |
| [enforce-rest-conventions](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/enforce-rest-conventions) |  |  |  | ESLint rule documentation for enforce-rest-conventions |  |  |  |  |  |
| [no-external-api-calls-in-utils](https://eslint.interlace.tools/docs/quality/plugin-modularity/rules/no-external-api-calls-in-utils) |  |  |  | ESLint rule documentation for no-external-api-calls-in-utils |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modularity"><img src="https://eslint.interlace.tools/images/og-modularity.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>