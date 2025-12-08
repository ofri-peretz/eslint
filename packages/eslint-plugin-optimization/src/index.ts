/**
 * @eslint/eslint-plugin-optimization
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Performance rules (generic)
import { noMemoryLeakListeners } from './rules/performance/no-memory-leak-listeners';
import { noBlockingOperations } from './rules/performance/no-blocking-operations';
import { noUnboundedCache } from './rules/performance/no-unbounded-cache';
import { detectNPlusOneQueries } from './rules/performance/detect-n-plus-one-queries';

export const rules = {
  // Flat names
  'no-memory-leak-listeners': noMemoryLeakListeners,
  'no-blocking-operations': noBlockingOperations,
  'no-unbounded-cache': noUnboundedCache,
  'detect-n-plus-one-queries': detectNPlusOneQueries,

  // Categorized names
  'performance/no-memory-leak-listeners': noMemoryLeakListeners,
  'performance/no-blocking-operations': noBlockingOperations,
  'performance/no-unbounded-cache': noUnboundedCache,
  'performance/detect-n-plus-one-queries': detectNPlusOneQueries,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: '@eslint/eslint-plugin-optimization',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@eslint/optimization': plugin,
    },
    rules: {
      '@eslint/optimization/performance/detect-n-plus-one-queries': 'warn',
      '@eslint/optimization/performance/no-memory-leak-listeners': 'warn',
      '@eslint/optimization/performance/no-blocking-operations': 'warn',
      '@eslint/optimization/performance/no-unbounded-cache': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
