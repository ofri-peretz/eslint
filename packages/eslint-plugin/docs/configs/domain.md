# domain Configuration

Enforce domain-driven design patterns and ubiquitous language.

## Overview

The `domain` configuration helps teams implement Domain-Driven Design (DDD) principles by enforcing rich domain models, immutable value objects, and consistent domain terminology. It's designed for teams practicing DDD or building complex business applications.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.domain,
];
```

## Rules Included

| Rule | Severity | Description |
|------|----------|-------------|
| `domain/enforce-naming` | warn | Enforce domain-specific naming conventions |
| `ddd/ddd-anemic-domain-model` | warn | Detect anemic domain models (data without behavior) |
| `ddd/ddd-value-object-immutability` | warn | Enforce immutability in value objects |

## When to Use

**Use `domain` when:**
- Practicing Domain-Driven Design
- Building complex business applications
- Working with domain experts on ubiquitous language
- Maintaining rich domain models
- Implementing bounded contexts

**Combine with other configs:**

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.domain,
];
```

## Rule Details

### ddd-anemic-domain-model

Detects domain entities with data but no behavior:

```typescript
// ❌ Bad: Anemic model - only data, no behavior
class Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  customerId: string;
  createdAt: Date;
  // No methods! Business logic lives elsewhere
}

// External service doing what Order should do
class OrderService {
  calculateTotal(order: Order): number { /* ... */ }
  canBeCancelled(order: Order): boolean { /* ... */ }
  cancel(order: Order): void { /* ... */ }
}

// ✅ Good: Rich domain model - behavior with data
class Order {
  private id: string;
  private items: OrderItem[];
  private status: OrderStatus;
  private customerId: string;
  private createdAt: Date;

  calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.zero()
    );
  }

  canBeCancelled(): boolean {
    return this.status === OrderStatus.Pending 
        && this.createdAt.isWithinHours(24);
  }

  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new OrderCannotBeCancelledException(this.id);
    }
    this.status = OrderStatus.Cancelled;
  }
}
```

### ddd-value-object-immutability

Enforces immutability in value objects:

```typescript
// ❌ Bad: Mutable value object
class Money {
  amount: number;  // Public mutable property!
  currency: string;
  
  add(other: Money): void {
    this.amount += other.amount;  // Mutates!
  }
}

// ✅ Good: Immutable value object
class Money {
  private readonly amount: number;
  private readonly currency: Currency;
  
  constructor(amount: number, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }
  
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }
  
  equals(other: Money): boolean {
    return this.amount === other.amount 
        && this.currency.equals(other.currency);
  }
}
```

### domain/enforce-naming

Enforces ubiquitous language in domain code:

```typescript
// ❌ Bad: Generic/technical naming
class DataManager {
  processItem(item: any): void { /* ... */ }
}

// ✅ Good: Domain terminology
class OrderProcessor {
  fulfillOrder(order: Order): void { /* ... */ }
}
```

## Configuration Examples

### Domain Layer Only

```javascript
export default [
  llmOptimized.configs.recommended,
  {
    // Apply domain rules only to domain layer
    files: ['src/domain/**/*.ts'],
    ...llmOptimized.configs.domain,
    rules: {
      '@forge-js/llm-optimized/ddd/ddd-anemic-domain-model': 'error',
      '@forge-js/llm-optimized/ddd/ddd-value-object-immutability': 'error',
    },
  },
];
```

### Custom Domain Terms

```javascript
export default [
  llmOptimized.configs.domain,
  {
    rules: {
      '@forge-js/llm-optimized/domain/enforce-naming': ['warn', {
        // Define your ubiquitous language
        terms: {
          // Generic term → Domain term
          'user': 'customer',
          'item': 'product',
          'process': 'fulfill',
          'delete': 'archive',
          'data': 'entity',
        },
        // Files where domain terms are enforced
        include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      }],
    },
  },
];
```

### Bounded Context Configuration

```javascript
export default [
  // Order bounded context
  {
    files: ['src/contexts/order/**/*.ts'],
    rules: {
      '@forge-js/llm-optimized/domain/enforce-naming': ['warn', {
        terms: {
          'user': 'customer',
          'buy': 'place',
          'item': 'lineItem',
        },
      }],
    },
  },
  // Inventory bounded context
  {
    files: ['src/contexts/inventory/**/*.ts'],
    rules: {
      '@forge-js/llm-optimized/domain/enforce-naming': ['warn', {
        terms: {
          'item': 'stockUnit',
          'count': 'quantity',
        },
      }],
    },
  },
];
```

## DDD Folder Structure

Recommended structure for DDD projects:

```
src/
├── domain/           # Domain layer - apply domain config
│   ├── entities/
│   ├── valueObjects/
│   ├── aggregates/
│   ├── repositories/ # Interfaces only
│   └── services/     # Domain services
├── application/      # Use cases
│   ├── commands/
│   ├── queries/
│   └── handlers/
├── infrastructure/   # Technical details
│   ├── persistence/
│   ├── messaging/
│   └── api/
└── presentation/     # UI layer
```

## Resources

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.co/)
- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
- [Martin Fowler on Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html)

