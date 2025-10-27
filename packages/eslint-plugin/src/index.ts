/**
 * @forge-js/eslint-plugin-llm-optimized
 * 
 * A solid TypeScript-based ESLint plugin infrastructure
 * Inspired by typescript-eslint
 * 
 * Compatible with ESLint 8+ and ESLint 9+
 * 
 * @see https://eslint.org/docs/latest/extend/plugins - ESLint Plugin Documentation
 * @see https://typescript-eslint.io/developers/custom-rules - TypeScript-ESLint Custom Rules
 */

import type { TSESLint } from '@forge-js/eslint-plugin-utils';
import { noConsoleLog } from './rules/no-console-log';
import { noCircularDependencies } from './rules/no-circular-dependencies';

/**
 * Collection of all ESLint rules provided by this plugin
 * 
 * Each rule must be created using the `createRule` utility from @forge-js/eslint-plugin-utils
 * which ensures proper typing and documentation generation.
 * 
 * @see https://typescript-eslint.io/developers/custom-rules#creating-a-rule - Rule Creation Guide
 * @see https://eslint.org/docs/latest/extend/custom-rules - ESLint Custom Rules
 * 
 * @example
 * ```typescript
 * import { plugin } from '@forge-js/eslint-plugin-llm-optimized';
 * 
 * // Access individual rules
 * const noConsoleLog = plugin.rules['no-console-log'];
 * ```
 */
export const rules = {
  'no-console-log': noConsoleLog,
  'no-circular-dependencies': noCircularDependencies,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object following the official plugin structure
 * 
 * This object is the main export of the plugin and contains:
 * - `meta`: Plugin metadata (name, version)
 * - `rules`: All available rules
 * 
 * @see https://eslint.org/docs/latest/extend/plugin-migration-flat-config - Flat Config Plugin Guide
 * @see https://eslint.org/docs/latest/extend/plugins#metadata-in-plugins - Plugin Metadata
 * 
 * @example
 * ```typescript
 * // ESLint Flat Config (v9+)
 * import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
 * 
 * export default [
 *   {
 *     plugins: {
 *       '@forge-js/llm-optimized': llmOptimized,
 *     },
 *     rules: {
 *       '@forge-js/llm-optimized/no-console-log': 'error',
 *     },
 *   },
 * ];
 * ```
 */
export const plugin = {
  meta: {
    name: '@forge-js/eslint-plugin-llm-optimized',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for common use cases
 * 
 * These configs provide ready-to-use rule configurations that follow best practices.
 * Users can extend these configs or use them as a starting point.
 * 
 * **Important:** ESLint automatically strips the 'eslint-plugin-' prefix from plugin names.
 * Therefore, use '@forge-js/llm-optimized' (not '@forge-js/eslint-plugin-llm-optimized')
 * when referencing this plugin in ESLint configurations.
 * 
 * @see https://eslint.org/docs/latest/use/configure/configuration-files - ESLint Configuration
 * @see https://eslint.org/docs/latest/use/configure/configuration-files#using-a-shareable-configuration-package - Shareable Configs
 * 
 * @example
 * ```typescript
 * // ESLint Flat Config (v9+)
 * import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
 * 
 * export default [
 *   llmOptimized.configs.recommended, // Use recommended config
 * ];
 * ```
 * 
 * @example
 * ```javascript
 * // Legacy .eslintrc format (v8)
 * module.exports = {
 *   plugins: ['@forge-js/llm-optimized'],
 *   extends: ['plugin:@forge-js/llm-optimized/recommended'],
 * };
 * ```
 */
export const configs = {
  /**
   * Recommended configuration for most projects
   * 
   * Includes essential rules with sensible defaults:
   * - Warns on console.log usage
   * - Errors on circular dependencies
   */
  recommended: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'warn',
      '@forge-js/llm-optimized/no-circular-dependencies': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
  
  /**
   * Strict configuration for production-ready code
   * 
   * All rules are set to 'error' for maximum code quality enforcement:
   * - Errors on console.log usage
   * - Errors on circular dependencies
   */
  strict: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'error',
      '@forge-js/llm-optimized/no-circular-dependencies': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

/**
 * Default export for ESLint plugin
 * 
 * This is the main entry point when importing the plugin.
 * It follows the ESLint Flat Config plugin structure.
 * 
 * @see https://eslint.org/docs/latest/extend/plugins#exporting-a-plugin - Plugin Exports Guide
 * 
 * @example
 * ```typescript
 * import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
 * 
 * export default [
 *   {
 *     plugins: {
 *       '@forge-js/llm-optimized': llmOptimized,
 *     },
 *   },
 * ];
 * ```
 */
export default plugin;
