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
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=modularity" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=modularity" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin enforces Domain-Driven Design (DDD) patterns, module isolation, and architectural best practices. It helps teams maintain clean, layered architectures by detecting anemic domain models, mutable value objects, and architectural boundary violations.

## Philosophy

**Interlace** fosters **strength through integration**. Good architecture isn't just documentation — it should be enforced. These rules encode architectural decisions as code, preventing drift and maintaining design integrity over time.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/modularity), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/modularity), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/modularity) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/modularity)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/modularity), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/modularity)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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

| Plugin                                                                                         |                                                                            Downloads                                                                             | Description                               |
| :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------- |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)         |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)     | Import ordering & dependency architecture |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive complexity & code quality       |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization)   | Modernize to ES2022+ syntax               |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/modularity"><img src="https://eslint.interlace.tools/images/og-architecture.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
