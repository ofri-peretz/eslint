---
title: ddd-anemic-domain-model
description: 'Detects entities with only getters/setters and no business logic, enforcing the Rich Domain Model over the Anemic Domain Model anti-pattern.'
category: modularity
tags: ['architecture', 'ddd', 'modularity']
---

> **Keywords:** ddd-anemic-domain-model, domain-driven design, rich domain model, anemic domain model, anti-pattern, encapsulation, business logic, Aggregate Root, ESLint rule

Detects entities with only getters/setters and no business logic. This rule is part of [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) and helps enforce strong Domain-Driven Design (DDD) principles by encouraging behavior-rich entities.

## Quick Summary

| Aspect          | Details                                  |
| --------------- | ---------------------------------------- |
| **Severity**    | Medium (maintainability/design)          |
| **Auto-Fix**    | ❌ No                                    |
| **Category**    | Modularity                               |
| **ESLint MCP**  | ✅ Optimized for ESLint MCP integration  |
| **Best For**    | Domain layers in DDD-based architectures |
| **Suggestions** | ✅ 3 suggestions for remediation         |

## The Anti-Pattern: Anemic Domain Model

**Vulnerability/Issue:** An Anemic Domain Model describes a domain layer where objects contain data but little or no logic. Instead, the logic is found in "Service" objects that manipulate the domain objects' state via getters and setters.

**Risk:** Anemic models lead to "Transaction Scripts" where business logic is fragmented across services, making it difficult to maintain invariants, increasing code duplication, and violating basic object-oriented principles like encapsulation.

## Error Message Format

The rule provides **LLM-optimized error messages** with actionable architectural guidance:

```text
📐 ARCHITECTURE | Anemic domain model detected in {{className}} | MEDIUM
   Fix: Add business logic methods to create a rich domain model | https://martinfowler.com/bliki/AnemicDomainModel.html
```

### Message Components

| Component             | Purpose                | Example                                                                      |
| :-------------------- | :--------------------- | :--------------------------------------------------------------------------- |
| **Domain Standard**   | Design benchmark       | [DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html)           |
| **Issue Description** | Specific violation     | `Class User has no business logic (only getters/setters)`                    |
| **Severity & Impact** | Design assessment      | `MEDIUM`                                                                     |
| **Fix Instruction**   | Actionable remediation | `Add domain behavior methods to encapsulate state`                           |
| **Technical Truth**   | Official reference     | [Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html) |

## Rule Details

This rule identifies classes that don't satisfy the minimum requirement of business logic methods. It ignores standard Data Transfer Objects (DTOs) by default using configurable naming patterns.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[🔍 Class Declaration] --> B{Matches DTO naming?}
    B -->|✅ Yes| C[✅ Skip (DTOs are anemic by design)]
    B -->|❌ No| D{Count non-getter/setter methods}
    D -->|Count < minBusinessMethods| E[🚨 Report Anemic Model]
    D -->|Count >= minBusinessMethods| F[✅ Pass (Rich Model)]

    E --> G[💡 Suggest: Add Behavior]
    E --> H[💡 Suggest: Identify Aggregate Root]
```

### Why This Matters

| Issue                  | Impact                               | Solution                                                      |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------- |
| 💊 **Encapsulation**   | State can be corrupted from anywhere | Move logic into the entity and make setters private/protected |
| 🧩 **Duplication**     | Logic repeated in multiple services  | Consolidate logic as methods on the domain model              |
| 🛠️ **Maintainability** | Hard to find where behavior resides  | Behavior lives with the data it operates on                   |

## Configuration

| Option               | Type       | Default                                                    | Description                                          |
| -------------------- | ---------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `minBusinessMethods` | `number`   | `1`                                                        | Minimum methods required to not be considered anemic |
| `ignoreDtos`         | `boolean`  | `true`                                                     | Whether to ignore classes matching DTO patterns      |
| `dtoPatterns`        | `string[]` | `['DTO', 'Dto', 'Data', 'Request', 'Response', 'Payload']` | Naming patterns used to identify DTOs/Data objects   |

## Examples

### ❌ Incorrect

```typescript
// Anemic Domain Model (Logic-less Entity)
class BankAccount {
  private balance: number = 0;

  public getBalance(): number {
    return this.balance;
  }

  public setBalance(amount: number): void {
    this.balance = amount;
  }
}

// Logic is forced into an external service
class BankService {
  withdraw(account: BankAccount, amount: number) {
    if (account.getBalance() >= amount) {
      account.setBalance(account.getBalance() - amount);
    }
  }
}
```

### ✅ Correct

```typescript
// Rich Domain Model (Encapsulated Behavior)
class BankAccount {
  private balance: number = 0;

  public withdraw(amount: number): void {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (this.balance < amount) throw new Error('Insufficient funds');

    this.balance -= amount;
  }

  public getBalance(): number {
    return this.balance;
  }
}
```

## Configuration Examples

### Enforce Stricter Models

```javascript
{
  rules: {
    'modularity/ddd-anemic-domain-model': ['error', {
      minBusinessMethods: 2,
      dtoPatterns: ['Model', 'Entity'] // Also ignore these patterns
    }]
  }
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Complex Setter Logic

**Why**: If a setter contains complex validation, the rule might still consider it a "simple setter" depending on the implementation complexity.

**Mitigation**: Review setters for business rule enforcement.

### Dynamic Methods

**Why**: Methods added to the prototype dynamically or via decorators that aren't statically visible might result in false positives.

**Mitigation**: Use the `minBusinessMethods: 0` if your framework uses heavy metaprogramming.

## References

- [Anemic Domain Model - Martin Fowler](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [DDD: Aggregate - Martin Fowler](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Rich Domain Model - Domain Centric Architecture](https://en.wikipedia.org/wiki/Domain-driven_design)
