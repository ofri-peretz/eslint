/**
 * Example usage of the exported Options types
 * 
 * This file demonstrates how to use the Options types exported from the barrel file.
 * 
 * @example Import Pattern 1: From main package
 * ```typescript
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized';
 * ```
 * 
 * @example Import Pattern 2: From types subpath
 * ```typescript
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';
 * ```
 * 
 * @example Full ESLint Configuration
 * ```typescript
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';
 * 
 * // Type-safe configuration object
 * const config: ReactNoInlineFunctionsOptions = {
 *   allowInEventHandlers: true,
 *   minArraySize: 20,
 * };
 * ```
 */

// ============================================================================
// Example 1: Individual Rule Options
// ============================================================================

import type {
  ReactNoInlineFunctionsOptions,
  NoCircularDependenciesOptions,
  NoConsoleLogOptions,
  CognitiveComplexityOptions,
} from './index';

// Type-safe configuration for react-no-inline-functions rule
const reactInlineFunctionsConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: false,
  minArraySize: 10,
};

// Type-safe configuration for no-circular-dependencies rule
const noCircularDepsConfig: NoCircularDependenciesOptions = {
  maxDepth: 10,
  ignorePatterns: ['**/*.test.ts', '**/__mocks__/**'],
  fixStrategy: 'auto',
};

// Type-safe configuration for no-console-log rule
const noConsoleLogConfig: NoConsoleLogOptions = {
  strategy: 'remove',
  ignorePaths: ['src/logger/**', 'src/monitoring/**'],
  loggerName: 'logger',
  maxOccurrences: 'all',
};

// Type-safe configuration for cognitive-complexity rule
const complexityConfig: CognitiveComplexityOptions = {
  maxComplexity: 15,
  includeMetrics: true,
};

// ============================================================================
// Example 2: Combined Rules Configuration
// ============================================================================

import type { AllRulesOptions } from './index';

// Type-safe configuration for multiple rules
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

// ============================================================================
// Example 3: ESLint Configuration Usage
// ============================================================================

// Example ESLint config using the types
const eslintConfig = {
  plugins: {
    '@forge-js/llm-optimized': {},
  },
  rules: {
    '@forge-js/llm-optimized/performance/react-no-inline-functions': [
      'warn',
      reactInlineFunctionsConfig,
    ],
    '@forge-js/llm-optimized/architecture/no-circular-dependencies': [
      'error',
      noCircularDepsConfig,
    ],
    '@forge-js/llm-optimized/development/no-console-log': [
      'warn',
      noConsoleLogConfig,
    ],
    '@forge-js/llm-optimized/complexity/cognitive-complexity': [
      'warn',
      complexityConfig,
    ],
  },
};

export { reactInlineFunctionsConfig, noCircularDepsConfig, noConsoleLogConfig, complexityConfig, allRulesConfig, eslintConfig };

