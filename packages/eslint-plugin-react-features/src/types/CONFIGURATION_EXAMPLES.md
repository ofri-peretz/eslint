# ESLint Plugin Configuration Examples

Comprehensive examples demonstrating how to use the exported type-safe configuration options for all ESLint rules in both **ESLint 9+ (Flat Config)** and **ESLint 8 (Legacy)** formats.

## Table of Contents

- [Quick Start](#quick-start)
- [ESLint 9+ Examples (Flat Config)](#eslint-9-examples-flat-config)
- [ESLint 8 Examples (Legacy Config)](#eslint-8-examples-legacy-config)
- [Individual Rule Examples](#individual-rule-examples)
- [Advanced Patterns](#advanced-patterns)

---

## Quick Start

### Import Types

```typescript
// Method 1: From main package (recommended)
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized';

// Method 2: From types subpath
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

// Method 3: Import combined type for all rules
import type { AllRulesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';
```

---

## ESLint 9+ Examples (Flat Config)

### Example 1: Basic Setup with Recommended Config

```typescript
// eslint.config.js (ESLint 9+)
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ...llmOptimized.configs.recommended,
  },
];
```

### Example 2: Single Rule Configuration (Type-Safe)

```typescript
// eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const inlineConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true,
  minArraySize: 20,
};

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': [
        'warn',
        inlineConfig,
      ],
    },
  },
];
```

### Example 3: Multiple Rules Configuration

```typescript
// eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type {
  ReactNoInlineFunctionsOptions,
  NoCircularDependenciesOptions,
  NoConsoleLogOptions,
  CognitiveComplexityOptions,
} from '@forge-js/eslint-plugin-llm-optimized/types';

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': [
        'warn',
        {
          allowInEventHandlers: true,
          minArraySize: 20,
        } satisfies ReactNoInlineFunctionsOptions,
      ],
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': [
        'error',
        {
          maxDepth: 10,
          ignorePatterns: ['**/*.test.ts', '**/__mocks__/**'],
          fixStrategy: 'auto',
        } satisfies NoCircularDependenciesOptions,
      ],
      '@forge-js/llm-optimized/development/no-console-log': [
        'warn',
        {
          strategy: 'remove',
          ignorePaths: ['src/logger/**'],
          autoDetectLogger: true,
        } satisfies NoConsoleLogOptions,
      ],
      '@forge-js/llm-optimized/complexity/cognitive-complexity': [
        'warn',
        {
          maxComplexity: 15,
          includeMetrics: true,
        } satisfies CognitiveComplexityOptions,
      ],
    },
  },
];
```

### Example 4: Using AllRulesOptions Type

```typescript
// eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { AllRulesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

// Define all rules configuration in one object
const allRulesConfig: AllRulesOptions = {
  'react-no-inline-functions': {
    allowInEventHandlers: true,
    minArraySize: 20,
  },
  'no-circular-dependencies': {
    maxDepth: 10,
    fixStrategy: 'module-split',
  },
  'no-console-log': {
    strategy: 'convert',
    loggerName: 'logger',
  },
  'cognitive-complexity': {
    maxComplexity: 20,
  },
};

// Create rule configurations dynamically
const ruleConfigs = Object.entries(allRulesConfig).reduce(
  (acc, [ruleName, config]) => {
    const fullRuleName = `@forge-js/llm-optimized/${ruleName}`;
    acc[fullRuleName] = ['warn', config];
    return acc;
  },
  {},
);

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: ruleConfigs,
  },
];
```

### Example 5: Strict Configuration with Type Safety

```typescript
// eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type {
  NoSqlInjectionOptions,
  DatabaseInjectionOptions,
  DetectChildProcessOptions,
  NoUnsafeDynamicRequireOptions,
} from '@forge-js/eslint-plugin-llm-optimized/types';

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      // Security rules - all errors
      '@forge-js/llm-optimized/security/no-sql-injection': [
        'error',
        {
          allowDynamicTableNames: false,
          trustedFunctions: [],
        } satisfies NoSqlInjectionOptions,
      ],
      '@forge-js/llm-optimized/security/database-injection': [
        'error',
        {
          detectNoSQL: true,
          detectORMs: true,
          frameworkHints: true,
        } satisfies DatabaseInjectionOptions,
      ],
      '@forge-js/llm-optimized/security/detect-child-process': [
        'error',
        {
          allowLiteralStrings: false,
          allowLiteralSpawn: false,
        } satisfies DetectChildProcessOptions,
      ],
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': [
        'error',
        {
          allowDynamicImport: false,
        } satisfies NoUnsafeDynamicRequireOptions,
      ],
    },
  },
];
```

### Example 6: Environment-Specific Configuration

```typescript
// eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { NoConsoleLogOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

// Development: allow console.log (warn only)
const devConfig: NoConsoleLogOptions = {
  strategy: 'warn',
  ignorePaths: [],
  autoDetectLogger: true,
};

// Production: remove all console.log
const prodConfig: NoConsoleLogOptions = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**', 'src/debug/**'],
  autoDetectLogger: true,
};

const isDev = process.env.NODE_ENV === 'development';

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': [
        'warn',
        isDev ? devConfig : prodConfig,
      ],
    },
  },
];
```

---

## ESLint 8 Examples (Legacy Config)

### Example 1: Basic Setup with Recommended Config

```javascript
// .eslintrc.js (ESLint 8)
module.exports = {
  plugins: ['@forge-js/llm-optimized'],
  extends: ['plugin:@forge-js/llm-optimized/recommended'],
};
```

### Example 2: Single Rule Configuration (Type-Safe with JSDoc)

```javascript
// .eslintrc.js (ESLint 8)
/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').ReactNoInlineFunctionsOptions} */
const inlineConfig = {
  allowInEventHandlers: true,
  minArraySize: 20,
};

module.exports = {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/performance/react-no-inline-functions':
      ['warn', inlineConfig],
  },
};
```

### Example 3: Multiple Rules Configuration

```javascript
// .eslintrc.js (ESLint 8)
/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').ReactNoInlineFunctionsOptions} */
const inlineConfig = {
  allowInEventHandlers: true,
  minArraySize: 20,
};

/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').NoCircularDependenciesOptions} */
const circularConfig = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts'],
  fixStrategy: 'auto',
};

/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').NoConsoleLogOptions} */
const consoleConfig = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**'],
  autoDetectLogger: true,
};

module.exports = {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/performance/react-no-inline-functions':
      ['warn', inlineConfig],
    '@forge-js/eslint-plugin-llm-optimized/architecture/no-circular-dependencies':
      ['error', circularConfig],
    '@forge-js/eslint-plugin-llm-optimized/development/no-console-log': [
      'warn',
      consoleConfig,
    ],
  },
};
```

### Example 4: Strict Security Configuration

```javascript
// .eslintrc.js (ESLint 8)
/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').NoSqlInjectionOptions} */
const sqlInjectionConfig = {
  allowDynamicTableNames: false,
  trustedFunctions: [],
};

/** @type {import('@forge-js/eslint-plugin-llm-optimized/types').DatabaseInjectionOptions} */
const dbInjectionConfig = {
  detectNoSQL: true,
  detectORMs: true,
  frameworkHints: true,
};

module.exports = {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  extends: ['plugin:@forge-js/eslint-plugin-llm-optimized/security'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/security/no-sql-injection': [
      'error',
      sqlInjectionConfig,
    ],
    '@forge-js/eslint-plugin-llm-optimized/security/database-injection': [
      'error',
      dbInjectionConfig,
    ],
  },
};
```

### Example 5: With TypeScript Configuration File

```typescript
// eslint.config.ts (ESLint 8 with TypeScript)
import type {
  ReactNoInlineFunctionsOptions,
  NoCircularDependenciesOptions,
  NoConsoleLogOptions,
} from '@forge-js/eslint-plugin-llm-optimized/types';

const inlineConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true,
  minArraySize: 20,
};

const circularConfig: NoCircularDependenciesOptions = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts'],
  fixStrategy: 'auto',
};

const consoleConfig: NoConsoleLogOptions = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**'],
  autoDetectLogger: true,
};

export default {
  plugins: ['@forge-js/eslint-plugin-llm-optimized'],
  rules: {
    '@forge-js/eslint-plugin-llm-optimized/performance/react-no-inline-functions':
      ['warn', inlineConfig],
    '@forge-js/eslint-plugin-llm-optimized/architecture/no-circular-dependencies':
      ['error', circularConfig],
    '@forge-js/eslint-plugin-llm-optimized/development/no-console-log': [
      'warn',
      consoleConfig,
    ],
  },
};
```

---

## Individual Rule Examples

### react-no-inline-functions

```typescript
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: false, // Strict: prevent inline functions everywhere
  minArraySize: 10, // Report when arrays have 10+ items
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': [
        'warn',
        config,
      ],
    },
  },
];
```

### no-circular-dependencies

```typescript
import type { NoCircularDependenciesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoCircularDependenciesOptions = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts', '**/__mocks__/**'],
  barrelExports: ['index.ts', 'index.tsx', 'index.js'],
  reportAllCycles: true,
  fixStrategy: 'auto', // Auto-detect best fix strategy
  moduleNamingConvention: 'semantic',
  coreModuleSuffix: 'core',
  extendedModuleSuffix: 'extended',
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': [
        'error',
        config,
      ],
    },
  },
];
```

### no-internal-modules

```typescript
import type { NoInternalModulesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoInternalModulesOptions = {
  strategy: 'error',
  ignorePaths: [],
  allow: [], // Explicitly allowed internal paths
  forbid: ['private/**'], // Explicitly forbidden paths
  maxDepth: 1, // Only allow direct imports from barrel files
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/architecture/no-internal-modules': [
        'error',
        config,
      ],
    },
  },
];
```

### no-console-log

```typescript
import type { NoConsoleLogOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoConsoleLogOptions = {
  strategy: 'remove', // 'remove', 'convert', 'comment', 'warn'
  ignorePaths: ['src/logger/**'],
  loggerName: 'logger',
  maxOccurrences: 'all', // Report all instances
  autoDetectLogger: true,
  sourcePatterns: ['console'], // Also match other logging objects
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': ['warn', config],
    },
  },
];
```

### cognitive-complexity

```typescript
import type { CognitiveComplexityOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: CognitiveComplexityOptions = {
  maxComplexity: 15, // SonarQube default
  includeMetrics: true,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/complexity/cognitive-complexity': [
        'warn',
        config,
      ],
    },
  },
];
```

### database-injection

```typescript
import type { DatabaseInjectionOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DatabaseInjectionOptions = {
  detectNoSQL: true,
  detectORMs: true,
  trustedSources: [],
  frameworkHints: true,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/database-injection': ['error', config],
    },
  },
];
```

### detect-child-process

```typescript
import type { DetectChildProcessOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DetectChildProcessOptions = {
  allowLiteralStrings: false, // Strict: no literal strings allowed
  allowLiteralSpawn: false,
  additionalMethods: [],
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/detect-child-process': [
        'error',
        config,
      ],
    },
  },
];
```

### no-sql-injection

```typescript
import type { NoSqlInjectionOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoSqlInjectionOptions = {
  allowDynamicTableNames: false,
  trustedFunctions: [],
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/no-sql-injection': ['error', config],
    },
  },
];
```

### img-requires-alt

```typescript
import type { ImgRequiresAltOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: ImgRequiresAltOptions = {
  allowAriaLabel: false,
  allowAriaLabelledby: false,
};

// Use in ESLint 9+ config
export default [
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      '@forge-js/llm-optimized/accessibility/img-requires-alt': [
        'error',
        config,
      ],
    },
  },
];
```

### required-attributes

```typescript
import type { RequiredAttributesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: RequiredAttributesOptions = {
  attributes: [
    {
      attribute: 'alt',
      ignoreTags: [],
      suggestedValue: 'Descriptive text',
    },
  ],
  ignoreComponents: ['CustomImage'],
};

// Use in ESLint 9+ config
export default [
  {
    files: ['**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/react/required-attributes': ['error', config],
    },
  },
];
```

### detect-eval-with-expression

```typescript
import type { DetectEvalWithExpressionOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DetectEvalWithExpressionOptions = {
  allowLiteralStrings: false,
  additionalEvalFunctions: [],
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/detect-eval-with-expression': [
        'error',
        config,
      ],
    },
  },
];
```

### detect-non-literal-regexp

```typescript
import type { DetectNonLiteralRegexpOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DetectNonLiteralRegexpOptions = {
  allowLiterals: false,
  additionalPatterns: [],
  maxPatternLength: 1000,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/detect-non-literal-regexp': [
        'error',
        config,
      ],
    },
  },
];
```

### detect-non-literal-fs-filename

```typescript
import type { DetectNonLiteralFsFilenameOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DetectNonLiteralFsFilenameOptions = {
  allowLiterals: false,
  additionalMethods: [],
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/detect-non-literal-fs-filename': [
        'error',
        config,
      ],
    },
  },
];
```

### detect-object-injection

```typescript
import type { DetectObjectInjectionOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: DetectObjectInjectionOptions = {
  allowLiterals: false,
  additionalMethods: [],
  dangerousProperties: ['__proto__', 'prototype', 'constructor'],
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/detect-object-injection': [
        'error',
        config,
      ],
    },
  },
];
```

### react-class-to-hooks

```typescript
import type { ReactClassToHooksOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: ReactClassToHooksOptions = {
  ignorePureRenderComponents: false,
  allowComplexLifecycle: false,
};

// Use in ESLint 9+ config
export default [
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': [
        'warn',
        config,
      ],
    },
  },
];
```

### no-deprecated-api

```typescript
import type { NoDeprecatedApiOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoDeprecatedApiOptions = {
  apis: [
    {
      name: 'oldFunction',
      replacement: 'newFunction',
      deprecatedSince: '2.0.0',
      removalDate: '3.0.0',
      reason: 'Better performance with new implementation',
      migrationGuide: 'https://example.com/migration',
    },
  ],
  warnDaysBeforeRemoval: 90,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/deprecation/no-deprecated-api': ['warn', config],
    },
  },
];
```

### enforce-naming

```typescript
import type { EnforceNamingOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: EnforceNamingOptions = {
  domain: 'ecommerce',
  terms: [
    {
      incorrect: 'item',
      correct: 'product',
      context: 'Use domain term for catalog items',
      examples: ['cartItem', 'inventoryItem'],
    },
  ],
  glossaryUrl: 'https://example.com/domain-glossary',
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/domain/enforce-naming': ['warn', config],
    },
  },
];
```

### identical-functions

```typescript
import type { IdenticalFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: IdenticalFunctionsOptions = {
  minLines: 3,
  similarityThreshold: 0.9,
  ignoreTestFiles: true,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/duplication/identical-functions': [
        'warn',
        config,
      ],
    },
  },
];
```

### no-unsafe-dynamic-require

```typescript
import type { NoUnsafeDynamicRequireOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: NoUnsafeDynamicRequireOptions = {
  allowDynamicImport: false,
};

// Use in ESLint 9+ config
export default [
  {
    rules: {
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': [
        'error',
        config,
      ],
    },
  },
];
```

---

## Advanced Patterns

### Configuration Factory Function

```typescript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { AllRulesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

function createESLintConfig(
  env: 'development' | 'production',
): AllRulesOptions {
  const isDev = env === 'development';

  return {
    'no-console-log': isDev
      ? { strategy: 'warn', ignorePaths: [] }
      : { strategy: 'remove', ignorePaths: ['src/logger/**'] },
    'cognitive-complexity': isDev
      ? { maxComplexity: 20 }
      : { maxComplexity: 15 },
    'react-no-inline-functions': {
      allowInEventHandlers: isDev,
      minArraySize: isDev ? 50 : 10,
    },
  };
}

const configs = createESLintConfig(process.env.NODE_ENV);

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      // Map configuration object to ESLint rules
      ...Object.entries(configs).reduce((acc, [ruleName, config]) => {
        if (config) {
          acc[`@forge-js/llm-optimized/${ruleName}`] = ['warn', config];
        }
        return acc;
      }, {}),
    },
  },
];
```

### Team Standards Configuration

```typescript
// team-eslint-config.ts
import type {
  NoCircularDependenciesOptions,
  CognitiveComplexityOptions,
  NoConsoleLogOptions,
} from '@forge-js/eslint-plugin-llm-optimized/types';

/**
 * Team-wide ESLint standards
 * All projects should extend this configuration
 */
export const teamStandards = {
  architecture: {
    'no-circular-dependencies': {
      maxDepth: 5,
      fixStrategy: 'module-split',
      moduleNamingConvention: 'semantic',
    } satisfies NoCircularDependenciesOptions,
  },
  quality: {
    'cognitive-complexity': {
      maxComplexity: 12,
      includeMetrics: true,
    } satisfies CognitiveComplexityOptions,
  },
  logging: {
    'no-console-log': {
      strategy: 'remove',
      loggerName: 'logger',
    } satisfies NoConsoleLogOptions,
  },
};

// Usage in project eslint.config.ts
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import { teamStandards } from './team-eslint-config';

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': [
        'error',
        teamStandards.architecture['no-circular-dependencies'],
      ],
      '@forge-js/llm-optimized/complexity/cognitive-complexity': [
        'warn',
        teamStandards.quality['cognitive-complexity'],
      ],
      '@forge-js/llm-optimized/development/no-console-log': [
        'warn',
        teamStandards.logging['no-console-log'],
      ],
    },
  },
];
```

### Preset Configurations

```typescript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { AllRulesOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

// Security-first preset
export const securityPreset: AllRulesOptions = {
  'database-injection': {
    detectNoSQL: true,
    detectORMs: true,
    frameworkHints: true,
  },
  'detect-child-process': {
    allowLiteralStrings: false,
    allowLiteralSpawn: false,
  },
  'no-sql-injection': {
    allowDynamicTableNames: false,
  },
  'detect-eval-with-expression': {
    allowLiteralStrings: false,
  },
  'no-unsafe-dynamic-require': {
    allowDynamicImport: false,
  },
};

// Quality-first preset
export const qualityPreset: AllRulesOptions = {
  'cognitive-complexity': {
    maxComplexity: 12,
    includeMetrics: true,
  },
  'identical-functions': {
    minLines: 2,
    similarityThreshold: 0.85,
  },
  'no-circular-dependencies': {
    maxDepth: 5,
    fixStrategy: 'auto',
  },
};

// React-specific preset
export const reactPreset: AllRulesOptions = {
  'react-no-inline-functions': {
    allowInEventHandlers: false,
    minArraySize: 10,
  },
  'react-class-to-hooks': {
    ignorePureRenderComponents: false,
  },
  'img-requires-alt': undefined,
  'required-attributes': {
    attributes: [{ attribute: 'alt', suggestedValue: 'Descriptive text' }],
  },
};
```

---

## Naming Suggestions

Better naming for native English speakers:

| Current Name               | Suggested Alternative                            | Usage                              |
| -------------------------- | ------------------------------------------------ | ---------------------------------- |
| `__example.ts`             | (moved to CONFIG_USAGE_EXAMPLES.md)              | ✅ Much clearer                    |
| `CONFIG_USAGE_EXAMPLES.md` | `CONFIGURATION_EXAMPLES.md`                      | Alternative (slightly more formal) |
| `AllRulesOptions`          | `CompleteRulesConfig` or `AllRulesConfiguration` | More natural English               |
| `ImgRequiresAltOptions`    | `ImageAltTextOptions`                            | More descriptive                   |

**Recommendation:** Keep current naming as it's clear and follows conventions.

---

## See Also

- [README.md](./README.md) - Quick start and overview
- [rule-specific docs](../docs/rules/) - Detailed documentation for each rule
