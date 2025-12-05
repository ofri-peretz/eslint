/**
 * eslint-plugin-dependencies
 *
 * ESLint plugin for dependency management with 30 LLM-optimized rules.
 * Covers import validation, module resolution, circular dependencies,
 * and export style enforcement.
 *
 * Compatible with ESLint 8+ and ESLint 9+
 *
 * @see https://eslint.org/docs/latest/extend/plugins - ESLint Plugin Documentation
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Module Resolution Rules
import { noDuplicates } from './rules/no-duplicates';
import { named } from './rules/named';
import { defaultRule } from './rules/default';
import { namespace } from './rules/namespace';
import { extensions } from './rules/extensions';
import { noSelfImport } from './rules/no-self-import';
import { noUnresolved } from './rules/no-unresolved';

// Module System Rules
import { noAmd } from './rules/no-amd';
import { noCommonjs } from './rules/no-commonjs';
import { noNodejsModules } from './rules/no-nodejs-modules';

// Dependency Boundaries Rules
import {
  noCircularDependencies,
  clearCircularDependencyCache,
} from './rules/no-circular-dependencies';
import { noInternalModules } from './rules/no-internal-modules';
import { noCrossDomainImports } from './rules/no-cross-domain-imports';
import { enforceDependencyDirection } from './rules/enforce-dependency-direction';
import { noRestrictedPaths } from './rules/no-restricted-paths';
import { noRelativeParentImports } from './rules/no-relative-parent-imports';

// Export Style Rules
import { noDefaultExport } from './rules/no-default-export';
import { noNamedExport } from './rules/no-named-export';
import { preferDefaultExport } from './rules/prefer-default-export';
import { noAnonymousDefaultExport } from './rules/no-anonymous-default-export';
import { noMutableExports } from './rules/no-mutable-exports';
import { noDeprecated } from './rules/no-deprecated';

// Import Style Rules
import { enforceImportOrder } from './rules/enforce-import-order';
import { noUnassignedImport } from './rules/no-unassigned-import';
import { first } from './rules/first';
import { newlineAfterImport } from './rules/newline-after-import';

// Dependency Management Rules
import { noExtraneousDependencies } from './rules/no-extraneous-dependencies';
import { noUnusedModules } from './rules/no-unused-modules';
import { maxDependencies } from './rules/max-dependencies';
import { preferNodeProtocol } from './rules/prefer-node-protocol';

/**
 * Collection of all ESLint rules provided by this plugin
 */
export const rules = {
  // Flat rule names (for easier usage)
  'no-duplicates': noDuplicates,
  named: named,
  default: defaultRule,
  namespace: namespace,
  extensions: extensions,
  'no-self-import': noSelfImport,
  'no-unresolved': noUnresolved,
  'no-amd': noAmd,
  'no-commonjs': noCommonjs,
  'no-nodejs-modules': noNodejsModules,
  'no-circular-dependencies': noCircularDependencies,
  'no-internal-modules': noInternalModules,
  'no-cross-domain-imports': noCrossDomainImports,
  'enforce-dependency-direction': enforceDependencyDirection,
  'no-restricted-paths': noRestrictedPaths,
  'no-relative-parent-imports': noRelativeParentImports,
  'no-default-export': noDefaultExport,
  'no-named-export': noNamedExport,
  'prefer-default-export': preferDefaultExport,
  'no-anonymous-default-export': noAnonymousDefaultExport,
  'no-mutable-exports': noMutableExports,
  'no-deprecated': noDeprecated,
  'enforce-import-order': enforceImportOrder,
  'no-unassigned-import': noUnassignedImport,
  first: first,
  'newline-after-import': newlineAfterImport,
  'no-extraneous-dependencies': noExtraneousDependencies,
  'no-unused-modules': noUnusedModules,
  'max-dependencies': maxDependencies,
  'prefer-node-protocol': preferNodeProtocol,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object following the official plugin structure
 */
export const plugin = {
  meta: {
    name: 'eslint-plugin-dependencies',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for common use cases
 */
export const configs = {
  /**
   * Recommended configuration for most projects
   *
   * Includes essential rules with sensible defaults:
   * - Errors on unresolved imports
   * - Errors on circular dependencies
   * - Warns on module system violations
   * - Warns on import order issues
   */
  recommended: {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      // Module Resolution - Critical
      'dependencies/no-unresolved': 'error',
      'dependencies/named': 'error',
      'dependencies/default': 'error',
      'dependencies/namespace': 'warn',
      'dependencies/no-duplicates': 'error',

      // Dependency Boundaries - Critical
      'dependencies/no-circular-dependencies': 'error',
      'dependencies/no-self-import': 'error',

      // Module System - Recommended
      'dependencies/no-amd': 'warn',
      'dependencies/no-commonjs': 'warn',

      // Import Style - Recommended
      'dependencies/enforce-import-order': 'warn',
      'dependencies/first': 'warn',
      'dependencies/newline-after-import': 'warn',

      // Dependency Management
      'dependencies/no-extraneous-dependencies': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict configuration for maximum enforcement
   *
   * All rules set to error for production-ready code
   */
  strict: {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      // Module Resolution
      'dependencies/no-unresolved': 'error',
      'dependencies/named': 'error',
      'dependencies/default': 'error',
      'dependencies/namespace': 'error',
      'dependencies/extensions': 'error',
      'dependencies/no-self-import': 'error',
      'dependencies/no-duplicates': 'error',

      // Module System
      'dependencies/no-amd': 'error',
      'dependencies/no-commonjs': 'error',
      'dependencies/no-nodejs-modules': 'error',

      // Dependency Boundaries
      'dependencies/no-circular-dependencies': 'error',
      'dependencies/no-internal-modules': 'error',
      'dependencies/no-cross-domain-imports': 'error',
      'dependencies/enforce-dependency-direction': 'error',
      'dependencies/no-restricted-paths': 'error',
      'dependencies/no-relative-parent-imports': 'error',

      // Export Style
      'dependencies/no-anonymous-default-export': 'error',
      'dependencies/no-mutable-exports': 'error',
      'dependencies/no-deprecated': 'error',

      // Import Style
      'dependencies/enforce-import-order': 'error',
      'dependencies/no-unassigned-import': 'error',
      'dependencies/first': 'error',
      'dependencies/newline-after-import': 'error',

      // Dependency Management
      'dependencies/no-extraneous-dependencies': 'error',
      'dependencies/no-unused-modules': 'error',
      'dependencies/max-dependencies': 'error',
      'dependencies/prefer-node-protocol': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Module resolution focused configuration
   *
   * Ensures all imports resolve correctly
   */
  'module-resolution': {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      'dependencies/no-unresolved': 'error',
      'dependencies/named': 'error',
      'dependencies/default': 'error',
      'dependencies/namespace': 'error',
      'dependencies/extensions': 'warn',
      'dependencies/no-self-import': 'error',
      'dependencies/no-duplicates': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Import style focused configuration
   *
   * Enforces consistent import formatting
   */
  'import-style': {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      'dependencies/enforce-import-order': 'error',
      'dependencies/first': 'error',
      'dependencies/newline-after-import': 'error',
      'dependencies/no-duplicates': 'error',
      'dependencies/no-unassigned-import': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * ESM-only configuration
   *
   * Enforces ES Modules and prohibits CommonJS/AMD
   */
  esm: {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      'dependencies/no-amd': 'error',
      'dependencies/no-commonjs': 'error',
      'dependencies/prefer-node-protocol': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Architecture boundaries configuration
   *
   * Enforces clean architecture and module boundaries
   */
  architecture: {
    plugins: {
      dependencies: plugin,
    },
    rules: {
      'dependencies/no-circular-dependencies': 'error',
      'dependencies/no-internal-modules': 'error',
      'dependencies/no-cross-domain-imports': 'error',
      'dependencies/enforce-dependency-direction': 'error',
      'dependencies/no-restricted-paths': 'error',
      'dependencies/no-relative-parent-imports': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

// Re-export utility for clearing circular dependency cache
export { clearCircularDependencyCache };

// Default export for ESLint flat config
export default plugin;
