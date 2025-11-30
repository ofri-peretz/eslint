# recommended Configuration

The default configuration for most projects with balanced enforcement.

## Overview

The `recommended` configuration provides a carefully curated set of rules that work well for most JavaScript/TypeScript projects. It balances code quality enforcement with developer experience, using warnings for style issues and errors for critical problems.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llmOptimized.configs.recommended,
];
```

## Rules Included

### Security Rules (Critical - Error Level)

| Rule | Description |
|------|-------------|
| `security/no-sql-injection` | Prevent SQL injection via string concatenation |
| `security/no-unsafe-dynamic-require` | Forbid dynamic require() with non-literal arguments |
| `security/database-injection` | Comprehensive injection detection (SQL, NoSQL, ORM) |
| `security/no-unsanitized-html` | Prevent XSS via unsanitized HTML injection |
| `security/no-exposed-sensitive-data` | Detect PII exposure in logs |

### Security Rules (Important - Warning Level)

| Rule | Description |
|------|-------------|
| `security/no-hardcoded-credentials` | Detect hardcoded passwords, API keys, tokens |
| `security/no-weak-crypto` | Detect weak cryptography (MD5, SHA1, DES) |
| `security/no-insufficient-random` | Detect weak random (Math.random()) |
| `security/no-unvalidated-user-input` | Detect unvalidated user input usage |
| `security/no-unescaped-url-parameter` | Detect unescaped URL parameters |
| `security/no-missing-cors-check` | Detect missing CORS validation |
| `security/no-insecure-comparison` | Detect insecure == and != comparisons |
| `security/no-missing-authentication` | Detect missing auth checks in routes |
| `security/no-privilege-escalation` | Detect privilege escalation vulnerabilities |
| `security/no-insecure-cookie-settings` | Detect insecure cookie configurations |
| `security/no-missing-csrf-protection` | Detect missing CSRF protection |
| `security/no-document-cookie` | Detect document.cookie usage |
| `security/no-unencrypted-transmission` | Detect HTTP vs HTTPS issues |
| `security/no-sensitive-data-exposure` | Detect sensitive data exposure |

### Architecture Rules (Error Level)

| Rule | Description |
|------|-------------|
| `architecture/no-circular-dependencies` | Detect circular dependencies with chain analysis |
| `architecture/no-internal-modules` | Forbid importing internal/deep module paths |
| `architecture/no-unresolved` | Detect unresolved imports |
| `development/no-nodejs-modules` | Forbid Node.js built-in modules in browser code |

### Architecture Rules (Warning Level)

| Rule | Description |
|------|-------------|
| `architecture/no-cross-domain-imports` | Prevent cross-domain imports |
| `architecture/enforce-dependency-direction` | Enforce dependency direction |
| `architecture/prefer-node-protocol` | Enforce node: protocol for Node.js imports |
| `architecture/consistent-existence-index-check` | Consistent property checks |
| `architecture/prefer-event-target` | Prefer EventTarget over EventEmitter |
| `architecture/prefer-at` | Prefer .at() for array/string access |
| `architecture/no-unreadable-iife` | Prevent unreadable IIFEs |
| `architecture/no-await-in-loop` | Disallow await in loops |
| `architecture/no-self-import` | Prevent self-imports |
| `architecture/no-unused-modules` | Find unused exports |
| `architecture/no-extraneous-dependencies` | Detect extraneous dependencies |
| `architecture/no-relative-parent-imports` | Forbid relative parent imports |
| `architecture/no-default-export` | Forbid default exports (configurable) |
| `architecture/no-named-export` | Forbid named exports (configurable) |
| `architecture/no-unassigned-import` | Forbid unassigned imports |
| `architecture/max-dependencies` | Limit module dependencies |
| `architecture/no-anonymous-default-export` | Forbid anonymous exports |
| `architecture/no-restricted-paths` | Restrict import paths |
| `architecture/no-deprecated` | Detect deprecated imports |
| `architecture/no-mutable-exports` | Forbid mutable exports |
| `architecture/prefer-default-export` | Prefer default export for single exports |
| `architecture/no-external-api-calls-in-utils` | No API calls in utility modules |

### Development Rules (Warning Level)

| Rule | Description |
|------|-------------|
| `development/no-console-log` | Warn on console.log in production code |
| `development/no-console-spaces` | Detect console statement spacing issues |
| `development/no-amd` | Forbid AMD module syntax |
| `development/no-commonjs` | Forbid CommonJS require/exports |

### Quality Rules (Warning Level)

| Rule | Description |
|------|-------------|
| `complexity/cognitive-complexity` | Limit cognitive complexity (SonarQube-inspired) |
| `complexity/nested-complexity-hotspots` | Detect nested complexity hotspots |
| `duplication/identical-functions` | Detect duplicate function implementations |
| `accessibility/img-requires-alt` | Images must have alt text |

### Performance Rules (Warning Level)

| Rule | Description |
|------|-------------|
| `performance/detect-n-plus-one-queries` | Detect N+1 query patterns |
| `performance/react-render-optimization` | Suggest React render optimizations |

### Domain Rules (Warning Level)

| Rule | Description |
|------|-------------|
| `ddd/ddd-anemic-domain-model` | Detect anemic domain models |
| `ddd/ddd-value-object-immutability` | Enforce value object immutability |
| `api/enforce-rest-conventions` | Enforce REST API conventions |

## When to Use

**Use `recommended` when:**
- Starting a new project
- You want sensible defaults without configuration
- You need a balance between strictness and developer experience
- You want both security and quality rules

**Consider other configs when:**
- You need maximum security (`security` config)
- You're preparing for production (`strict` config)
- You have specific React requirements (`react` or `react-modern` configs)

## Customization

Override specific rules as needed:

```javascript
export default [
  llmOptimized.configs.recommended,
  {
    rules: {
      // Make console.log an error in CI
      '@forge-js/llm-optimized/development/no-console-log': 'error',
      
      // Disable if using barrel files
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'off',
    },
  },
];
```

## Combining with Other Configs

```javascript
// Maximum coverage
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs['react-modern'],  // For React projects
];
```

