# strict Configuration

Maximum code quality enforcement with all rules set to error.

## Overview

The `strict` configuration enforces the highest code quality standards by setting all rules to `error` level. This configuration is ideal for production-ready code, CI/CD pipelines, or teams that want zero tolerance for code quality issues.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.strict,
];
```

## Key Differences from `recommended`

| Aspect | `recommended` | `strict` |
|--------|---------------|----------|
| Console logs | ⚠️ warn | ❌ error |
| Security rules | Mixed (warn/error) | ❌ All errors |
| Architecture rules | Mixed (warn/error) | ❌ All errors |
| Quality rules | ⚠️ warn | ❌ error |
| Build blocking | Only critical issues | All issues |

## Rules Included (All Error Level)

### Security Rules

All security rules from `recommended` plus:
- All security rules set to `error` level
- No warnings - immediate feedback on security issues

### Architecture Rules

| Rule | Description |
|------|-------------|
| `architecture/no-circular-dependencies` | No circular dependencies allowed |
| `architecture/no-internal-modules` | No deep imports |
| `architecture/no-cross-domain-imports` | Strict domain boundaries |
| `architecture/enforce-dependency-direction` | Strict layered architecture |
| `architecture/prefer-at` | Modern array access required |
| `architecture/no-unreadable-iife` | Clean code only |
| `architecture/no-await-in-loop` | Performance anti-patterns blocked |
| `architecture/no-self-import` | Clean imports |
| `architecture/no-unused-modules` | No dead code |
| `architecture/no-extraneous-dependencies` | Clean dependencies |
| `architecture/max-dependencies` | Limit coupling |
| `architecture/no-anonymous-default-export` | Named exports required |
| `architecture/no-restricted-paths` | Path restrictions enforced |
| `architecture/no-deprecated` | No deprecated imports |
| `architecture/no-mutable-exports` | Immutable exports |
| `architecture/prefer-default-export` | Consistent export style |
| `architecture/no-external-api-calls-in-utils` | Clean utilities |

### Development Rules

| Rule | Description |
|------|-------------|
| `development/no-console-log` | No console.log allowed |
| `development/no-console-spaces` | Clean console output |

### Quality Rules

| Rule | Description |
|------|-------------|
| `complexity/cognitive-complexity` | Strict complexity limits |
| `complexity/nested-complexity-hotspots` | No deeply nested code |
| `duplication/identical-functions` | No duplicate code |

### Performance Rules

| Rule | Description |
|------|-------------|
| `performance/react-no-inline-functions` | No inline functions in JSX |
| `performance/detect-n-plus-one-queries` | No N+1 queries |
| `performance/react-render-optimization` | Optimized renders required |

### Domain Rules

| Rule | Description |
|------|-------------|
| `ddd/ddd-anemic-domain-model` | Rich domain models required |
| `ddd/ddd-value-object-immutability` | Immutable value objects |
| `api/enforce-rest-conventions` | REST conventions enforced |

## When to Use

**Use `strict` when:**
- Preparing code for production release
- Running in CI/CD pipelines where you want to fail on any issue
- Team has agreed to zero-tolerance policy
- Codebase is mature and stable

**Don't use `strict` when:**
- Prototyping or exploring
- Learning the codebase
- You need warnings to gradually improve code quality
- Working on legacy code that can't be fixed immediately

## CI/CD Integration

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint . --max-warnings 0
```

## Gradual Adoption

If you're migrating from `recommended` to `strict`:

```javascript
// Phase 1: Start with recommended
export default [
  llmOptimized.configs.recommended,
];

// Phase 2: Add strict for new files only
export default [
  llmOptimized.configs.recommended,
  {
    files: ['src/new/**/*.ts'],
    ...llmOptimized.configs.strict,
  },
];

// Phase 3: Full strict
export default [
  llmOptimized.configs.strict,
];
```

## Relaxing Specific Rules

If `strict` is too aggressive for certain rules:

```javascript
export default [
  llmOptimized.configs.strict,
  {
    rules: {
      // Allow console in development utilities
      '@forge-js/llm-optimized/development/no-console-log': ['error', {
        allowInNodeScripts: true,
      }],
      
      // Relax complexity for specific complex algorithms
      '@forge-js/llm-optimized/complexity/cognitive-complexity': ['error', {
        maxComplexity: 20,
      }],
    },
  },
];
```

