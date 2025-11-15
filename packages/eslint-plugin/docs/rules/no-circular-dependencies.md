# no-circular-dependencies

> **Keywords:** circular dependencies, CWE-407, architecture, ESLint rule, module dependencies, bundle size, tree-shaking, memory optimization, build performance, auto-fix, LLM-optimized, barrel exports

Detects and reports circular dependencies that cause memory bloat during bundling and potential runtime initialization issues. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-407 (Circular Dependency) |
| **Severity** | High (architecture issue) |
| **Auto-Fix** | ⚠️ Suggests fixes (manual application) |
| **Category** | Architecture |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For** | Large codebases, monorepos, applications with complex module structures |

## Rule Details

Circular dependencies occur when module A imports module B, and module B (directly or through intermediaries) imports module A. This creates problems:

- **Memory Bloat**: Bundlers cannot tree-shake or deduplicate modules in a cycle
- **Initialization Issues**: Unpredictable module initialization order
- **Build Performance**: Slower builds due to inability to parallelize
- **Runtime Errors**: Potential undefined references during initialization

### LLM-Optimized Error Messages

This rule provides structured, actionable error messages optimized for both LLM understanding and human readability:

- **Emoji indicators** for quick visual scanning (🔄 🚨 📦)
- **Structured sections** with clear headers
- **Complete dependency chain** showing the full cycle path
- **Specific fix suggestions** with before/after code examples
- **Context explanations** of why the issue occurs

## Options

```typescript
{
  "maxDepth": 10,               // Max traversal depth (performance)
  "reportAllCycles": true,       // Report all cycles, not just first
  "ignorePatterns": [            // Files to skip
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.stories.tsx",
    "**/__tests__/**",
    "**/__mocks__/**"
  ],
  "infrastructurePaths": [       // Critical paths (stricter checking)
    "src/infrastructure/**",
    "src/services/**",
    "src/core/**"
  ],
  "barrelExports": [             // Files considered barrel exports
    "index.ts",
    "index.tsx",
    "index.js",
    "index.jsx"
  ]
}
```

## Examples

### ❌ Incorrect

#### Basic Circular Dependency

```typescript
// file-a.ts
import { funcB } from './file-b';
export const funcA = () => funcB();

// file-b.ts
import { funcA } from './file-a'; // 🔄 Circular dependency!
export const funcB = () => funcA();
```

**Error Message:**

```
🔄 CIRCULAR DEPENDENCY DETECTED

Dependency Chain:
  1. file-a → file-b
  2. file-b → 🔄 file-a

Cycle Summary: 2 modules form a circular dependency

⚠️ MEMORY IMPACT:
Circular dependencies force bundlers to create separate chunks...
[Full explanation provided]
```

#### Barrel Export Cycle

```typescript
// components/index.ts
export * from './Button';
export * from './Modal';

// components/Button.ts
import { Modal } from './index'; // 📦 Importing from barrel!

// components/Modal.ts
import { Button } from './index'; // Creates cycle through barrel
```

**Error Message:**

```
📦 BARREL EXPORT CIRCULAR DEPENDENCY

Dependency Chain:
  1. components/Button → components/index
  2. components/index → 🔄 components/Modal

⚠️ MEMORY IMPACT:
Barrel exports must load ALL re-exported modules...

Fix Example:
❌ Current (causes cycle):
   import { Modal } from './index'

✅ Better (direct import):
   import { Modal } from './Modal'
```

#### Infrastructure Cycle (Critical)

```typescript
// src/services/logger.ts
import { config } from '../utils/config';
export const logger = createLogger(config);

// src/utils/config.ts
import { logger } from '../services/logger'; // 🚨 Critical!
logger.info('Loading config'); // Can cause undefined reference
```

**Error Message:**

```
🚨 CRITICAL: INFRASTRUCTURE CIRCULAR DEPENDENCY

⚠️ CRITICAL MEMORY IMPACT:
Infrastructure modules should NEVER have circular dependencies.
They are loaded early and kept in memory throughout lifecycle.

HOW TO FIX (PRIORITY):
1. Extract shared types/constants to a dedicated types file
2. Use dependency injection patterns
3. Implement dependency inversion principle
4. Consider using events/pub-sub to decouple
```

### ✅ Correct

#### Direct Imports

```typescript
// components/Button.ts
import { Modal } from './Modal'; // Direct import

// components/Modal.ts
import { Icon } from './Icon'; // No cycle

// components/index.ts (barrel export used only by consumers)
export { Button } from './Button';
export { Modal } from './Modal';
```

#### Extracted Shared Module

```typescript
// shared/types.ts
export interface User {
  id: string;
  name: string;
}

// services/auth.ts
import type { User } from '../shared/types';
export const getUser = (): User => {...};

// services/profile.ts
import type { User } from '../shared/types';
import { getUser } from './auth'; // No cycle!
```

#### Dependency Injection

```typescript
// services/logger.ts
export class Logger {
  log(message: string) {...}
}

// utils/processor.ts
export class Processor {
  constructor(private logger: Logger) {} // Injected

  process() {
    this.logger.log('Processing');
  }
}

// app.ts
import { Logger } from './services/logger';
import { Processor } from './utils/processor';

const logger = new Logger();
const processor = new Processor(logger); // No cycle!
```

## Configuration Examples

### ESLint 9+ (Flat Config)

```typescript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { NoCircularDependenciesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoCircularDependenciesOptions = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts', '**/__mocks__/**'],
  fixStrategy: 'auto',
  moduleNamingConvention: 'semantic',
};

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': [
        'error',
        config,
      ],
    },
  },
];
```

### ESLint 8 (Legacy Config with JSDoc Types)

```javascript
/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').NoCircularDependenciesOptions} */
const config = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts', '**/__mocks__/**'],
  fixStrategy: 'auto',
  moduleNamingConvention: 'semantic',
};

module.exports = {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/architecture/no-circular-dependencies':
      ['error', config],
  },
};
```

For more examples and patterns, see [CONFIGURATION_EXAMPLES.md](../../src/types/CONFIGURATION_EXAMPLES.md#no-circular-dependencies)

## Performance Optimizations

This rule includes several performance optimizations:

1. **Compiled Regex Cache**: Glob patterns compiled once and reused
2. **File Existence Cache**: Reduces redundant filesystem checks
3. **Dependency Cache**: Import analysis cached per file
4. **Early Termination**: Optional (can report all cycles)
5. **Visited Path Tracking**: Prevents redundant traversal
6. **Cycle Deduplication**: Uses hashing to avoid duplicate reports

## When Not To Use It

You might want to disable this rule if:

- 🧪 Working on a quick prototype where architecture doesn't matter
- 📦 Using a bundler that handles circular dependencies well (rare)
- ⚡ Build time is more important than bundle size
- 🔧 Refactoring a legacy codebase (enable gradually)

## Comparison with Other Rules

| Rule                       | Detects Cycles | Barrel-Aware | Performance | LLM-Optimized |
| -------------------------- | -------------- | ------------ | ----------- | ------------- |
| `import/no-cycle`          | ✅             | ❌           | Slow        | ❌            |
| `no-circular-dependencies` | ✅             | ✅           | Fast        | ✅            |

## Error Message Format

This rule provides LLM-optimized error messages:

```
🔄 Circular Dependency (CWE-407) | HIGH
   ❌ Current: A.ts → B.ts → C.ts → A.ts (creates cycle)
   ✅ Fix: Extract shared types to types.ts, break cycle at C.ts
   📚 https://en.wikipedia.org/wiki/Circular_dependency
```

**Why this format?**
- **Structured** - AI assistants can parse and understand
- **Actionable** - Shows dependency chain and fix suggestions
- **Educational** - Includes CWE reference and documentation link
- **Context-aware** - Different messages for barrel exports vs infrastructure cycles

## When Not To Use It

| Scenario | Recommendation |
|----------|----------------|
| **Quick Prototypes** | Disable for prototypes where architecture doesn't matter |
| **Bundler Handles It** | Rare - most bundlers struggle with cycles |
| **Legacy Codebases** | Enable gradually during refactoring |
| **Build Time Priority** | If bundle size is less important |

## Comparison with Alternatives

| Feature | no-circular-dependencies | import/no-cycle | eslint-plugin-import |
|-------|--------------------------|-----------------|----------------------|
| **Barrel Export Detection** | ✅ Yes | ❌ No | ⚠️ Limited |
| **Performance** | ✅ Fast (cached) | ⚠️ Slow | ⚠️ Slow |
| **LLM-Optimized** | ✅ Yes | ❌ No | ❌ No |
| **ESLint MCP** | ✅ Optimized | ❌ No | ❌ No |
| **Infrastructure Detection** | ✅ Yes | ❌ No | ❌ No |
| **Fix Suggestions** | ✅ Detailed | ⚠️ Basic | ⚠️ Basic |

## Further Reading

- **[Circular Dependencies in JavaScript](https://medium.com/@bluepnume/circular-dependencies-in-javascript-a-k-a-coding-is-not-a-rock-paper-scissors-game-9c2a9eccd4bc)** - Understanding circular dependencies
- **[Rollup Tree-Shaking Issues](https://rollupjs.org/guide/en/#avoiding-circular-dependencies)** - How bundlers handle cycles
- **[Vite Dependency Pre-Bundling](https://vitejs.dev/guide/dep-pre-bundling.html)** - Vite's approach to dependencies
- **[Module Initialization Order](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)** - ES modules deep dive
- **[CWE-407 Documentation](https://cwe.mitre.org/data/definitions/407.html)** - Official CWE entry
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration

## Related Rules

- [`no-internal-modules`](./no-internal-modules.md) - Prevents importing internal/deep module paths
- [`enforce-naming`](./enforce-naming.md) - Enforces naming conventions

## Version

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+

## Changelog

- v0.0.1: Initial TypeScript implementation with LLM-optimized messages
  - Reports all cycles (not just first)
  - Performance optimizations
  - Barrel export detection
  - Infrastructure path detection
  - Direct import suggestions
