# no-console-log

Disallow `console.log` with configurable remediation strategies and LLM-optimized output.

## Rule Details

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
    A[🔍 Detect console.log] --> B{Check ignorePaths}
    B -->|🟢 Ignored| C[✅ Skip]
    B -->|🔴 Not Ignored| D{Check maxOccurrences}
    D -->|🔴 Over Limit| C
    D -->|🟢 Within Limit| E[🎯 Apply Strategy]
    
    E --> F{Strategy Type}
    F -->|🗑️ remove| G[Delete statement]
    F -->|🔄 convert| H[Replace with logger.debug]
    F -->|💬 comment| I[Comment out code]
    F -->|⚡ warn| J[Change to console.warn]
    
    G --> K[✅ Report with fix]
    H --> K
    I --> K
    J --> K
    
    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    classDef processNode fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1f2937
    
    class A startNode
    class G,H,I,J errorNode
    class K processNode
```

### Why This Matters

| Issue                | Impact                                | Solution                    |
| -------------------- | ------------------------------------- | --------------------------- |
| 🔒 **Security**      | May leak sensitive data in production | Use structured logging      |
| 🐛 **Debugging**     | Clutters console, hard to filter      | Environment-aware logging   |
| ⚡ **Performance**   | Uncontrolled logging impacts speed    | Configurable log levels     |
| 📊 **Observability** | Cannot aggregate or analyze logs      | Centralized logging systems |

## Configuration

| Option             | Type                                           | Default       | Description                                                                     |
| ------------------ | ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| `strategy`         | `'remove' \| 'convert' \| 'comment' \| 'warn'` | `'remove'`    | Remediation strategy                                                            |
| `ignorePaths`      | `string[]`                                     | `[]`          | Paths/patterns to ignore                                                        |
| `loggerName`       | `string`                                       | `'logger'`    | Logger object name (e.g., `'logger'`, `'winston'`)                              |
| `maxOccurrences`   | `number`                                       | `undefined`   | Max violations to report (0 = report all)                                       |
| `severityMap`      | `object`                                       | `{}`          | Map method names to logger methods (e.g., `{ log: 'info', debug: 'verbose' }`)  |
| `autoDetectLogger` | `boolean`                                      | `true`        | Auto-detect logger import in file                                               |
| `sourcePatterns`   | `string[]`                                     | `['console']` | Object names to match and replace (e.g., `['console', 'winston', 'oldLogger']`) |
| ~~`customLogger`~~ | `string`                                       | `'logger'`    | **Deprecated:** Use `loggerName` instead                                        |

### Strategy Comparison

| Strategy       | Behavior            | Use Case                    | Output                                     |
| -------------- | ------------------- | --------------------------- | ------------------------------------------ |
| 🗑️ **remove**  | Deletes statement   | Production cleanup          | `console.log("x")` → _(removed)_           |
| 🔄 **convert** | Replace with logger | Migration to proper logging | `console.log("x")` → `logger.debug("x")`   |
| 💬 **comment** | Comments out code   | Temporary debugging         | `console.log("x")` → `// console.log("x")` |
| ⚡ **warn**    | Change to warning   | Downgrade severity          | `console.log("x")` → `console.warn("x")`   |

## Examples

### ❌ Incorrect

```typescript
function processData(data: any) {
  console.log('Processing data:', data);
  return data.map((item) => item * 2);
}

class UserService {
  getUser(id: string) {
    console.log('Fetching user:', id);
    return this.db.users.find(id);
  }
}
```

### ✅ Correct

```typescript
import { logger } from './logger';

function processData(data: any) {
  logger.debug('Processing data:', { data });
  return data.map((item) => item * 2);
}

class UserService {
  getUser(id: string) {
    this.logger.debug('Fetching user', { userId: id });
    return this.db.users.find(id);
  }
}
```

## Configuration Examples

### Basic Usage (Default Strategy)

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      '@forge-js/no-console-log': 'error',
    },
  },
];
```

**Output Format:**

```
⚠️ console.log | src/app.ts:42 | Strategy: remove
```

### Strategy: Remove (Production Cleanup)

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'remove'
    }]
  }
}
```

```typescript
// Before
function calculate() {
  console.log('Calculating...');
  return 42;
}

// After (auto-fixed)
function calculate() {
  return 42;
}
```

### Strategy: Convert (Logger Migration)

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      loggerName: 'logger',      // Replace 'console' with 'logger'
      loggerMethod: 'info'        // Replace '.log()' with '.info()'
    }]
  }
}
```

```typescript
// Before
console.log('User logged in', userId);

// After (auto-fixed)
logger.info('User logged in', userId);
```

**With Custom Logger (e.g., Winston):**

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      loggerName: 'winston',
      severityMap: {
        'log': 'info',      // console.log → winston.info
        'debug': 'debug',   // console.debug → winston.debug
        'error': 'error',   // console.error → winston.error
        'warn': 'warn'      // console.warn → winston.warn
      }
    }]
  }
}
```

```typescript
// Before
console.log('Processing request');
console.debug('Debug details');
console.error('Something failed');

// After (auto-fixed)
winston.info('Processing request');
winston.debug('Debug details');
winston.error('Something failed');
```

### Strategy: Comment (Temporary Disable)

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'comment'
    }]
  }
}
```

```typescript
// Before
console.log('Debug info', data);

// After (auto-fixed)
// console.log("Debug info", data);
```

### Strategy: Warn (Downgrade Severity)

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'warn'
    }]
  }
}
```

```typescript
// Before
console.log('Important notice');

// After (auto-fixed)
console.warn('Important notice');
```

### Ignore Specific Paths

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'remove',
      ignorePaths: [
        'test',           // Ignore test directories
        'scripts',        // Ignore scripts directory
        '*.test.ts',      // Ignore test files
        'src/debug.ts'    // Ignore specific file
      ]
    }]
  }
}
```

### Limit Reported Violations

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      maxOccurrences: 10  // Only report first 10 violations
    }]
  }
}
```

### Replace Multiple Logging Objects (Legacy Projects)

Perfect for migrating legacy projects with mixed logging approaches:

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      loggerName: 'logger',                          // Target logger
      sourcePatterns: ['console', 'winston', 'oldLogger'],  // Replace all these
      severityMap: {
        log: 'info',
        debug: 'debug',
        error: 'error',
        warn: 'warn'
      }
    }]
  }
}
```

```typescript
// Before (mixed legacy logging)
console.log('User action');
winston.info('Database query');
oldLogger.debug('Cache hit');

// After (auto-fixed to unified logger)
logger.info('User action');
logger.info('Database query');
logger.debug('Cache hit');
```

**Safety:** Uses exact string matching - won't accidentally match `consoleUI` or `winstonConfig`.

### Custom Severity Mapping

Map specific console methods to different logger methods:

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      loggerName: 'logger',
      loggerMethod: 'info',       // Default for unmapped methods
      severityMap: {
        'log': 'info',             // console.log → logger.info
        'debug': 'verbose',        // console.debug → logger.verbose
        'error': 'error',          // console.error → logger.error
        'warn': 'warn'             // console.warn → logger.warn
      }
    }]
  }
}
```

**Result:**

```typescript
// Before
console.log('Info message');
console.debug('Debug message');
console.error('Error message');

// After (auto-fixed)
logger.info('Info message');
logger.verbose('Debug message');
logger.error('Error message');
```

### Auto-Detect Logger

```javascript
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      autoDetectLogger: true,     // Auto-detect 'logger', 'log', etc. in imports
      loggerName: 'winston',      // Fallback if no logger detected
      loggerMethod: 'info'        // Method to use
    }]
  }
}
```

**Auto-detection example:**

```typescript
// If you have this import
import { myLogger } from './utils';

// console.log will be converted to
myLogger.info(...)  // Auto-detected 'myLogger' (contains 'log')
```

### Team-Specific Configurations

```javascript
// Development environment
{
  rules: {
    '@forge-js/no-console-log': ['warn', {
      strategy: 'comment',
      ignorePaths: ['test', 'scripts']
    }]
  }
}

// Production environment
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      customLogger: 'logger',
      maxOccurrences: 0  // Report all violations
    }]
  }
}
```

## Type-Safe Configuration (ESLint 9+ & 8)

### ESLint 9+ (Flat Config)

```typescript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { NoConsoleLogOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoConsoleLogOptions = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**', 'src/debug/**'],
  loggerName: 'logger',
  autoDetectLogger: true,
};

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': ['warn', config],
    },
  },
];
```

### ESLint 8 (Legacy Config with JSDoc Types)

```javascript
/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').NoConsoleLogOptions} */
const config = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**', 'src/debug/**'],
  loggerName: 'logger',
  autoDetectLogger: true,
};

module.exports = {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/development/no-console-log': ['warn', config],
  },
};
```

For more examples and patterns, see [CONFIGURATION_EXAMPLES.md](../../src/types/CONFIGURATION_EXAMPLES.md#no-console-log)

## LLM-Optimized Output

The rule provides minimal, actionable messages optimized for both humans and LLMs:

```
⚠️ console.log | src/services/auth.ts:127 | Strategy: convert
```

### Output Format Breakdown

| Component                  | Purpose    | Example                 |
| -------------------------- | ---------- | ----------------------- |
| `⚠️ console.log`           | Issue type | Clear identification    |
| `src/services/auth.ts:127` | Location   | File path + line number |
| `Strategy: convert`        | Action     | Remediation method      |

### Multi-Strategy Suggestions

When a violation is detected, all strategies are available as suggestions:

```
⚠️ console.log | src/app.ts:42 | Strategy: remove

Suggestions:
  🗑️ Remove console.log statement
  🔄 Convert to logger.debug()
  💬 Comment out console.log
  ⚡ Replace with console.warn()
```

## Migration Patterns

### From console.log to Structured Logging

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'actorBkg': '#f1f5f9',
    'actorBorder': '#334155',
    'actorTextColor': '#1e293b',
    'activationBorderColor': '#2563eb',
    'activationBkgColor': '#dbeafe',
    'sequenceNumberColor': '#1e293b',
    'noteBorderColor': '#334155',
    'noteBkgColor': '#fef3c7',
    'noteTextColor': '#1e293b'
  }
}}%%
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant ESLint as 🔍 ESLint
    participant Code as 📝 Codebase
    
    Dev->>ESLint: Enable rule with "convert" strategy
    ESLint->>Code: Scan for console.log
    Code-->>ESLint: Found 47 violations
    ESLint->>Dev: Report with auto-fix suggestions
    Dev->>ESLint: Apply auto-fix
    ESLint->>Code: Replace with logger.debug()
    Code-->>Dev: ✅ Migration complete
    
    Note over Dev,Code: All console.log → logger.debug()
```

### Step-by-Step Migration

| Phase               | Configuration          | Goal                     |
| ------------------- | ---------------------- | ------------------------ |
| **1. Discovery**    | `strategy: 'comment'`  | Identify all occurrences |
| **2. Setup Logger** | Import logging library | Add infrastructure       |
| **3. Convert**      | `strategy: 'convert'`  | Auto-migrate code        |
| **4. Cleanup**      | `strategy: 'remove'`   | Remove debugging logs    |

## Advanced Usage

### Monorepo Configuration

```javascript
// apps/web/eslint.config.mjs
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'remove',
      ignorePaths: ['test']
    }]
  }
}

// apps/api/eslint.config.mjs
{
  rules: {
    '@forge-js/no-console-log': ['error', {
      strategy: 'convert',
      customLogger: 'winston',
      ignorePaths: ['scripts', 'migrations']
    }]
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/lint.yml
- name: Lint with auto-fix
  run: |
    npm run lint -- --fix
    git diff --exit-code || echo "Console.log violations auto-fixed"
```

## When Not To Use

| Scenario         | Recommendation                   |
| ---------------- | -------------------------------- |
| 🧪 Prototyping   | Disable or use `warn` severity   |
| 📚 Tutorials     | Add to `ignorePaths`             |
| 🔧 Build Scripts | Use `ignorePaths: ['scripts']`   |
| 🧪 Test Files    | Use `ignorePaths: ['*.test.ts']` |

## Comparison with Other Solutions

| Feature             | @forge-js/no-console-log | eslint-plugin-no-console | eslint built-in |
| ------------------- | ------------------------ | ------------------------ | --------------- |
| ✅ Auto-fix         | ✅ 4 strategies          | ❌ No                    | ❌ No           |
| 🎯 Suggestions      | ✅ All strategies        | ❌ No                    | ❌ No           |
| 📁 ignorePaths      | ✅ Pattern matching      | ❌ No                    | ⚠️ Limited      |
| 🤖 LLM-optimized    | ✅ Yes                   | ❌ No                    | ❌ No           |
| 🔄 Logger migration | ✅ Configurable          | ❌ No                    | ❌ No           |

## Further Reading

- [ESLint Rules Documentation](https://eslint.org/docs/latest/rules/)
- [Best Practices for Logging in Node.js](https://blog.logrocket.com/best-practices-logging-node-js/)
- [Structured Logging with Winston](https://github.com/winstonjs/winston)
- [MDN: Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console)
