# no-circular-dependencies

Detects and reports circular dependencies that cause memory bloat during bundling and potential runtime initialization issues.

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

## Further Reading

- [Circular Dependencies in JavaScript](https://medium.com/@bluepnume/circular-dependencies-in-javascript-a-k-a-coding-is-not-a-rock-paper-scissors-game-9c2a9eccd4bc)
- [Rollup Tree-Shaking Issues](https://rollupjs.org/guide/en/#avoiding-circular-dependencies)
- [Vite Dependency Pre-Bundling](https://vitejs.dev/guide/dep-pre-bundling.html)
- [Module Initialization Order](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)

## Version

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+

## Changelog

- v0.0.1: Initial TypeScript implementation with LLM-optimized messages
  - Reports all cycles (not just first)
  - Performance optimizations
  - Barrel export detection
  - Infrastructure path detection
  - Direct import suggestions
