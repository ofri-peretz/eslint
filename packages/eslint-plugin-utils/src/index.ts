/**
 * @forge-js/eslint-plugin-utils
 * 
 * Core utilities for creating TypeScript ESLint plugins
 * Inspired by typescript-eslint's infrastructure
 * 
 * This package provides:
 * - Rule creator utilities
 * - AST utilities
 * - Type utilities
 * - Common helper functions
 */

export * from './rule-creator';
export * from './ast-utils';
export * from './type-utils';
export * from './llm-message-format';

/**
 * Re-export commonly used types and utilities from @typescript-eslint/utils
 */
export { ESLintUtils } from '@typescript-eslint/utils';

export type {
  TSESLint,
  TSESTree,
  ParserServices,
} from '@typescript-eslint/utils';

