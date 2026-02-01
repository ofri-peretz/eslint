<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Architecture rules for DDD patterns, module isolation, and clean design.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-modularity.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-modularity" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-modularity.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

## Description

This plugin enforces Domain-Driven Design (DDD) patterns, module isolation, and architectural best practices. It helps teams maintain clean, layered architectures by detecting anemic domain models, mutable value objects, and architectural boundary violations.

## Philosophy

**Interlace** fosters **strength through integration**. Good architecture isn't just documentation — it should be enforced. These rules encode architectural decisions as code, preventing drift and maintaining design integrity over time.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/modularity), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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

## Rules

| Rule                                                                             | Description                                    | 💼  | ⚠️  |
| :------------------------------------------------------------------------------- | :--------------------------------------------- | :-: | :-: |
| [ddd-anemic-domain-model](./docs/rules/ddd-anemic-domain-model.md)               | Detect anemic domain models lacking behavior   | 💼  | ⚠️  |
| [ddd-value-object-immutability](./docs/rules/ddd-value-object-immutability.md)   | Enforce immutability in value objects          | 💼  |     |
| [enforce-naming](./docs/rules/enforce-naming.md)                                 | Enforce consistent naming conventions by layer | 💼  | ⚠️  |
| [enforce-rest-conventions](./docs/rules/enforce-rest-conventions.md)             | Enforce RESTful naming in API controllers      | 💼  |     |
| [no-external-api-calls-in-utils](./docs/rules/no-external-api-calls-in-utils.md) | Prevent external API calls in utility modules  | 💼  |     |

**Legend**: 💼 Recommended | ⚠️ Warns (not error)

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native quality plugins with LLM-optimized error messages:

| Plugin                                                                                                               | Description                               |
| :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)                               | Import ordering & dependency architecture |
| [`@interlace/eslint-plugin-maintainability`](https://www.npmjs.com/package/@interlace/eslint-plugin-maintainability) | Cognitive complexity & code quality       |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
