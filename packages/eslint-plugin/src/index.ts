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

// Development rules
import { noConsoleLog } from './rules/development/no-console-log';

// Architecture rules
import { noCircularDependencies } from './rules/architecture/no-circular-dependencies';
import { noInternalModules } from './rules/architecture/no-internal-modules';

// Security rules
import { noSqlInjection } from './rules/security/no-sql-injection';
import { noUnsafeDynamicRequire } from './rules/security/no-unsafe-dynamic-require';
import { databaseInjection } from './rules/security/database-injection';
import { detectEvalWithExpression } from './rules/security/detect-eval-with-expression';
import { detectChildProcess } from './rules/security/detect-child-process';
import { detectNonLiteralFsFilename } from './rules/security/detect-non-literal-fs-filename';
import { detectNonLiteralRegexp } from './rules/security/detect-non-literal-regexp';
import { detectObjectInjection } from './rules/security/detect-object-injection';

// Migration rules
import { reactClassToHooks } from './rules/migration/react-class-to-hooks';

// Performance rules
import { reactNoInlineFunctions } from './rules/performance/react-no-inline-functions';

// Accessibility rules
import { imgRequiresAlt } from './rules/accessibility/img-requires-alt';

// React rules
import { requiredAttributes } from './rules/react/required-attributes';

// Deprecation rules
import { noDeprecatedApi } from './rules/deprecation/no-deprecated-api';

// Domain rules
import { enforceNaming } from './rules/domain/enforce-naming';

// Complexity rules
import { cognitiveComplexity } from './rules/complexity/cognitive-complexity';

// Duplication rules
import { identicalFunctions } from './rules/duplication/identical-functions';

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
  // Flat rule names (for easier usage)
  'no-console-log': noConsoleLog,
  'no-circular-dependencies': noCircularDependencies,
  'no-internal-modules': noInternalModules,
  'no-sql-injection': noSqlInjection,
  'no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'database-injection': databaseInjection,
  'detect-eval-with-expression': detectEvalWithExpression,
  'detect-child-process': detectChildProcess,
  'detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'detect-object-injection': detectObjectInjection,
  'react-class-to-hooks': reactClassToHooks,
  'react-no-inline-functions': reactNoInlineFunctions,
  'img-requires-alt': imgRequiresAlt,
  'required-attributes': requiredAttributes,
  'no-deprecated-api': noDeprecatedApi,
  'enforce-naming': enforceNaming,
  'cognitive-complexity': cognitiveComplexity,
  'identical-functions': identicalFunctions,
  
  // Categorized rule names (for better organization)
  'development/no-console-log': noConsoleLog,
  'architecture/no-circular-dependencies': noCircularDependencies,
  'architecture/no-internal-modules': noInternalModules,
  'security/no-sql-injection': noSqlInjection,
  'security/no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'security/database-injection': databaseInjection,
  'security/detect-eval-with-expression': detectEvalWithExpression,
  'security/detect-child-process': detectChildProcess,
  'security/detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'security/detect-non-literal-regexp': detectNonLiteralRegexp,
  'security/detect-object-injection': detectObjectInjection,
  'migration/react-class-to-hooks': reactClassToHooks,
  'performance/react-no-inline-functions': reactNoInlineFunctions,
  'accessibility/img-requires-alt': imgRequiresAlt,
  'react/required-attributes': requiredAttributes,
  'deprecation/no-deprecated-api': noDeprecatedApi,
  'domain/enforce-naming': enforceNaming,
  'complexity/cognitive-complexity': cognitiveComplexity,
  'duplication/identical-functions': identicalFunctions,
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
    version: '0.0.3-rc.16',
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
   * - Warns on high cognitive complexity (SonarQube-inspired)
   * - Warns on duplicate implementations (SonarQube-inspired)
   */
  recommended: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'warn',
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'warn',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
  
  /**
   * Strict configuration for production-ready code
   * 
   * All rules are set to 'error' for maximum code quality enforcement
   * Includes SonarQube-inspired complexity and duplication rules
   */
  strict: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'error',
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'error',
      '@forge-js/llm-optimized/duplication/identical-functions': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Security-focused configuration
   * 
   * Enables all security rules for maximum protection
   * Includes comprehensive database injection detection (SonarQube-inspired)
   */
  security: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Architecture configuration
   * 
   * Enforces clean architecture and module boundaries
   */
  architecture: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
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
      '@forge-js/llm-optimized/react/required-attributes': 'warn',
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

  /**
   * SonarQube-inspired configuration
   * 
   * Advanced code quality rules inspired by SonarQube:
   * - Cognitive complexity detection
   * - Duplicate function detection
   * - Comprehensive injection prevention
   */
  sonarqube: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
      '@forge-js/llm-optimized/security/database-injection': 'error',
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

/**
 * Re-export all rule Options types for convenience
 * 
 * These can be imported from either the main package or the types subpath:
 * 
 * @example
 * ```typescript
 * // From main package
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized';
 * 
 * // From types subpath
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';
 * ```
 */
export type {
  // Accessibility
  ImgRequiresAltOptions,
  // Architecture
  NoCircularDependenciesOptions,
  NoInternalModulesOptions,
  // Complexity
  CognitiveComplexityOptions,
  // Deprecation
  NoDeprecatedApiOptions,
  // Development
  NoConsoleLogOptions,
  // Domain
  EnforceNamingOptions,
  // Duplication
  IdenticalFunctionsOptions,
  // Migration
  ReactClassToHooksOptions,
  // Performance
  ReactNoInlineFunctionsOptions,
  // React
  RequiredAttributesOptions,
  // Security
  DatabaseInjectionOptions,
  DetectChildProcessOptions,
  DetectEvalWithExpressionOptions,
  DetectNonLiteralFsFilenameOptions,
  DetectNonLiteralRegexpOptions,
  DetectObjectInjectionOptions,
  NoSqlInjectionOptions,
  NoUnsafeDynamicRequireOptions,
  // Combined type
  AllRulesOptions,
} from './types/index';
