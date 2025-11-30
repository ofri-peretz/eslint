# no-restricted-paths

> **Keywords:** restricted paths, module boundaries, architecture, layers, ESLint rule, LLM-optimized

Restrict which files can import from which directories. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (architecture)                                                 |
| **Auto-Fix**   | ❌ No (requires architecture change)                                 |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Layered architecture, domain boundaries                              |

## Rule Details

Enforces architectural boundaries by preventing imports between specific directories.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🏛️ **Layer violations**   | UI importing data layer         | Enforce boundaries        |
| 🔗 **Circular deps**      | Cross-layer dependencies        | One-way imports           |
| 📦 **Domain bleeding**    | Shared state across domains     | Explicit interfaces       |

## Examples

### ❌ Incorrect

```typescript
// src/ui/component.ts importing from data layer
import { repository } from '../data/repository';  // Violates layers!

// src/domain/service.ts importing from UI
import { Button } from '../ui/Button';  // Wrong direction!
```

### ✅ Correct

```typescript
// UI imports from domain (allowed)
import { UserService } from '@/domain/user';

// Domain imports from data (allowed)
import { UserRepository } from '@/data/user';

// Use interfaces/contracts
import type { IUserRepository } from '@/domain/interfaces';
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-restricted-paths': ['error', {
      zones: [
        {
          target: './src/ui',
          from: './src/data',
          message: 'UI cannot import from data layer directly'
        },
        {
          target: './src/domain',
          from: './src/ui',
          message: 'Domain cannot depend on UI'
        }
      ]
    }]
  }
}
```

## Related Rules

- [`enforce-dependency-direction`](./enforce-dependency-direction.md) - Layer direction
- [`no-cross-domain-imports`](./no-cross-domain-imports.md) - Domain boundaries

## Further Reading

- **[Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)** - Architecture principles

