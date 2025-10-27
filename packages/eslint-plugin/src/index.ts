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
import { noInternalModules } from './rules/no-internal-modules';

// Security rules
import { noSqlInjection } from './rules/security/no-sql-injection';
import { noUnsafeDynamicRequire } from './rules/security/no-unsafe-dynamic-require';

// Migration rules
import { reactClassToHooks } from './rules/migration/react-class-to-hooks';

// Performance rules
import { reactNoInlineFunctions } from './rules/performance/react-no-inline-functions';

// Accessibility rules
import { imgRequiresAlt } from './rules/accessibility/img-requires-alt';

// Deprecation rules
import { noDeprecatedApi } from './rules/deprecation/no-deprecated-api';

// Domain rules
import { enforceNaming } from './rules/domain/enforce-naming';

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
  // Core rules
  'no-console-log': noConsoleLog,
  'no-circular-dependencies': noCircularDependencies,
  'no-internal-modules': noInternalModules,
  
  // Security rules
  'security/no-sql-injection': noSqlInjection,
  'security/no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  
  // Migration rules
  'migration/react-class-to-hooks': reactClassToHooks,
  
  // Performance rules
  'performance/react-no-inline-functions': reactNoInlineFunctions,
  
  // Accessibility rules
  'accessibility/img-requires-alt': imgRequiresAlt,
  
  // Deprecation rules
  'deprecation/no-deprecated-api': noDeprecatedApi,
  
  // Domain rules
  'domain/enforce-naming': enforceNaming,
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
   * - Errors on deep module imports
   * - Errors on critical security issues
   * - Warns on accessibility violations
   */
  recommended: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'warn',
      '@forge-js/llm-optimized/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
  
  /**
   * Strict configuration for production-ready code
   * 
   * All rules are set to 'error' for maximum code quality enforcement
   */
  strict: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'error',
      '@forge-js/llm-optimized/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Security-focused configuration
   * 
   * Enables all security rules for maximum protection
   */
  security: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * React-specific configuration
   * 
   * Includes React migration and performance rules
   */
  react: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'warn',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Migration-focused configuration
   * 
   * Helps teams migrate to modern patterns
   */
  migration: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
      '@forge-js/llm-optimized/deprecation/no-deprecated-api': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Accessibility configuration
   * 
   * Enforces WCAG compliance
   */
  accessibility: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Performance configuration
   * 
   * Detects performance anti-patterns
   */
  performance: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Domain-specific configuration
   * 
   * Enforces ubiquitous language patterns
   */
  domain: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/domain/enforce-naming': 'warn',
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
