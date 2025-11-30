# architecture Configuration

Enforce clean architecture and module boundaries.

## Overview

The `architecture` configuration enforces clean code architecture principles including proper module boundaries, dependency direction, and import/export patterns. This configuration is essential for maintaining scalable, maintainable codebases.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.architecture,
];
```

## Rules Included (All Error Level)

### Dependency Management

| Rule | Description |
|------|-------------|
| `architecture/no-circular-dependencies` | Detect and prevent circular dependencies |
| `architecture/enforce-dependency-direction` | Enforce layered architecture (UI → Logic → Data) |
| `architecture/no-cross-domain-imports` | Prevent imports across domain boundaries |
| `architecture/no-extraneous-dependencies` | Detect unlisted dependencies |
| `architecture/max-dependencies` | Limit module coupling |

### Module Boundaries

| Rule | Description |
|------|-------------|
| `architecture/no-internal-modules` | Forbid importing internal/deep module paths |
| `architecture/no-self-import` | Prevent circular self-imports |
| `architecture/no-restricted-paths` | Restrict import paths by pattern |
| `architecture/no-external-api-calls-in-utils` | Keep utility modules pure |

### Export Patterns

| Rule | Description |
|------|-------------|
| `architecture/no-anonymous-default-export` | Require named default exports |
| `architecture/no-mutable-exports` | Forbid mutable exports |
| `architecture/prefer-default-export` | Prefer default for single exports |
| `architecture/no-deprecated` | Detect deprecated imports |
| `architecture/no-unused-modules` | Find unused exports |

### Code Quality

| Rule | Description |
|------|-------------|
| `architecture/prefer-at` | Prefer modern .at() method |
| `architecture/no-unreadable-iife` | Prevent unreadable IIFEs |
| `architecture/no-await-in-loop` | Prevent sequential async operations |

## Architecture Patterns Enforced

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│           UI/Presentation           │ ← Can import from Logic
├─────────────────────────────────────┤
│          Application Logic          │ ← Can import from Domain
├─────────────────────────────────────┤
│           Domain/Business           │ ← Can import from Data
├─────────────────────────────────────┤
│           Data/Infrastructure       │ ← Base layer
└─────────────────────────────────────┘
```

### Module Structure

```
src/
├── features/
│   ├── user/          # Domain boundary
│   │   ├── index.ts   # Public API only
│   │   ├── internal/  # No external access
│   │   └── types.ts
│   └── order/         # Different domain
│       └── index.ts
└── shared/            # Cross-cutting concerns
    └── utils/
```

## When to Use

**Use `architecture` when:**
- Building large-scale applications
- Working with multiple teams on same codebase
- Enforcing clean architecture principles
- Preparing for microservices extraction
- Maintaining modular monoliths

**Combine with other configs:**

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.architecture,  // Add architecture rules
];
```

## Configuration Examples

### Feature-Based Architecture

```javascript
export default [
  llmOptimized.configs.architecture,
  {
    rules: {
      '@forge-js/llm-optimized/architecture/no-cross-domain-imports': ['error', {
        domains: [
          { name: 'user', paths: ['src/features/user/**'] },
          { name: 'order', paths: ['src/features/order/**'] },
          { name: 'shared', paths: ['src/shared/**'], allowFrom: '*' },
        ],
      }],
    },
  },
];
```

### Layered Architecture

```javascript
export default [
  llmOptimized.configs.architecture,
  {
    rules: {
      '@forge-js/llm-optimized/architecture/enforce-dependency-direction': ['error', {
        layers: [
          { name: 'ui', paths: ['src/components/**', 'src/pages/**'] },
          { name: 'application', paths: ['src/services/**', 'src/hooks/**'] },
          { name: 'domain', paths: ['src/domain/**', 'src/models/**'] },
          { name: 'infrastructure', paths: ['src/api/**', 'src/db/**'] },
        ],
        direction: ['ui', 'application', 'domain', 'infrastructure'],
      }],
    },
  },
];
```

### Monorepo Package Boundaries

```javascript
export default [
  llmOptimized.configs.architecture,
  {
    rules: {
      '@forge-js/llm-optimized/architecture/no-internal-modules': ['error', {
        forbid: [
          // Only import from package entry points
          '@company/*/src/**',
          '@company/*/lib/**',
        ],
        allow: [
          '@company/*/types',
          '@company/*/utils',
        ],
      }],
    },
  },
];
```

## Common Issues & Solutions

### Circular Dependencies

```javascript
// ❌ Bad: A imports B, B imports A
// file: userService.ts
import { OrderService } from './orderService';

// file: orderService.ts
import { UserService } from './userService';

// ✅ Good: Extract shared interface
// file: types.ts
export interface IUserService { ... }
export interface IOrderService { ... }

// file: userService.ts
import { IOrderService } from './types';

// file: orderService.ts
import { IUserService } from './types';
```

### Deep Module Imports

```javascript
// ❌ Bad: Importing from internal paths
import { validate } from '@company/forms/src/internal/validators';

// ✅ Good: Import from public API
import { validate } from '@company/forms';
```

## Related Configs

- `recommended` - Includes architecture rules with warnings
- `strict` - Architecture rules as errors with quality rules

