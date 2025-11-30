# Configuration Guide

This plugin provides 11 pre-configured rule sets (configs) for different use cases. Each config is designed to work standalone or in combination with others.

## Quick Reference

| Config | Purpose | Best For |
|--------|---------|----------|
| [`recommended`](./recommended.md) | Balanced defaults | Most projects |
| [`strict`](./strict.md) | Maximum enforcement | Production code, CI/CD |
| [`security`](./security.md) | Security hardening | Security-critical apps |
| [`architecture`](./architecture.md) | Clean architecture | Large-scale apps |
| [`react`](./react.md) | React with migration | Mixed class/hooks codebases |
| [`react-modern`](./react-modern.md) | Modern React | Functional components only |
| [`migration`](./migration.md) | Modernization | Legacy code upgrades |
| [`accessibility`](./accessibility.md) | WCAG compliance | Public websites |
| [`performance`](./performance.md) | Performance analysis | Data-heavy apps |
| [`domain`](./domain.md) | DDD patterns | Business applications |
| [`sonarqube`](./sonarqube.md) | SonarQube-style | Code quality metrics |

## Quick Start

### Single Config

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.recommended,
];
```

### Multiple Configs

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.security,
  llmOptimized.configs['react-modern'],
];
```

## Common Combinations

### React + TypeScript Application

```javascript
import tseslint from 'typescript-eslint';
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  ...tseslint.configs.recommended,
  llmOptimized.configs.recommended,
  llmOptimized.configs['react-modern'],
];
```

### Node.js Backend

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.security,
  llmOptimized.configs.architecture,
];
```

### Enterprise Application

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.strict,
  llmOptimized.configs.security,
  llmOptimized.configs.domain,
  llmOptimized.configs.sonarqube,
];
```

### Public Website

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs['react-modern'],
  llmOptimized.configs.accessibility,
  llmOptimized.configs.performance,
];
```

## Config Compatibility Matrix

Most configs can be combined. Here's what works well together:

| Config | Combines Well With |
|--------|-------------------|
| `recommended` | All configs |
| `strict` | `security`, `sonarqube` |
| `security` | All configs |
| `architecture` | `recommended`, `domain` |
| `react` | `recommended`, `accessibility` |
| `react-modern` | `recommended`, `performance`, `accessibility` |
| `migration` | `react`, `recommended` |
| `accessibility` | `react`, `react-modern` |
| `performance` | `react-modern`, `recommended` |
| `domain` | `architecture`, `recommended` |
| `sonarqube` | `recommended`, `strict` |

## Per-Directory Configuration

Apply different configs to different parts of your codebase:

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  // Base rules for all files
  llmOptimized.configs.recommended,
  
  // Stricter for source code
  {
    files: ['src/**/*.ts'],
    ...llmOptimized.configs.strict,
  },
  
  // Security focus for API
  {
    files: ['src/api/**/*.ts'],
    ...llmOptimized.configs.security,
  },
  
  // React rules for components
  {
    files: ['src/components/**/*.tsx'],
    ...llmOptimized.configs['react-modern'],
  },
  
  // Domain rules for business logic
  {
    files: ['src/domain/**/*.ts'],
    ...llmOptimized.configs.domain,
  },
  
  // Relaxed for tests
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@forge-js/llm-optimized/security/no-hardcoded-credentials': 'off',
    },
  },
];
```

## Customizing Configs

Override specific rules after applying a config:

```javascript
export default [
  llmOptimized.configs.recommended,
  {
    rules: {
      // Override specific rules
      '@forge-js/llm-optimized/development/no-console-log': 'error',
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'warn',
    },
  },
];
```

## Migration Guide

### From No Config

1. Start with `recommended`
2. Run ESLint and fix errors first
3. Gradually enable additional configs

### From Another ESLint Plugin

1. Start with `recommended` (similar to most plugins)
2. Add `security` if you had security rules
3. Add `react` or `react-modern` based on your codebase

### From SonarQube

1. Start with `sonarqube` config
2. Add `recommended` for additional coverage
3. Tune thresholds to match your SonarQube settings

## Need Help?

- [GitHub Discussions](https://github.com/ofri-peretz/forge-js/discussions)
- [Issue Tracker](https://github.com/ofri-peretz/forge-js/issues)
- [Plugin README](../../README.md)

