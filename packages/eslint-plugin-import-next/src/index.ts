/**
 * eslint-plugin-import-next
 *
 * Drop-in replacement for eslint-plugin-import with 46 LLM-optimized rules.
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
import { noAbsolutePath } from './rules/no-absolute-path';
import { noDynamicRequire } from './rules/no-dynamic-require';
import { noRelativePackages } from './rules/no-relative-packages';
import { noUselessPathSegments } from './rules/no-useless-path-segments';

// Module System Rules
import { noAmd } from './rules/no-amd';
import { noCommonjs } from './rules/no-commonjs';
import { noNodejsModules } from './rules/no-nodejs-modules';
import { noImportModuleExports } from './rules/no-import-module-exports';
import { unambiguous } from './rules/unambiguous';

// Dependency Boundaries Rules
import { noCycle, clearCircularDependencyCache } from './rules/no-cycle';
import { noInternalModules } from './rules/no-internal-modules';
import { noCrossDomainImports } from './rules/no-cross-domain-imports';
import { enforceDependencyDirection } from './rules/enforce-dependency-direction';
import { noRestrictedPaths } from './rules/no-restricted-paths';
import { noRelativeParentImports } from './rules/no-relative-parent-imports';

// Export Style Rules
import { exportRule } from './rules/export';
import { noDefaultExport } from './rules/no-default-export';
import { noNamedExport } from './rules/no-named-export';
import { preferDefaultExport } from './rules/prefer-default-export';
import { noAnonymousDefaultExport } from './rules/no-anonymous-default-export';
import { noMutableExports } from './rules/no-mutable-exports';
import { noDeprecated } from './rules/no-deprecated';
import { exportsLast } from './rules/exports-last';
import { groupExports } from './rules/group-exports';

// Import Style Rules
import { enforceImportOrder } from './rules/enforce-import-order';
import { noUnassignedImport } from './rules/no-unassigned-import';
import { first } from './rules/first';
import { newlineAfterImport } from './rules/newline-after-import';
import { noEmptyNamedBlocks } from './rules/no-empty-named-blocks';
import { noNamedAsDefault } from './rules/no-named-as-default';
import { noNamedAsDefaultMember } from './rules/no-named-as-default-member';
import { noNamedDefault } from './rules/no-named-default';
import { noNamespace } from './rules/no-namespace';
import { consistentTypeSpecifierStyle } from './rules/consistent-type-specifier-style';
import { dynamicImportChunkname } from './rules/dynamic-import-chunkname';

// Dependency Management Rules
import { noExtraneousDependencies } from './rules/no-extraneous-dependencies';
import { noUnusedModules } from './rules/no-unused-modules';
import { maxDependencies } from './rules/max-dependencies';
import { preferNodeProtocol } from './rules/prefer-node-protocol';

// Bundle Optimization Rules (Phase 2)
import { noBarrelFile } from './rules/no-barrel-file';
import { noBarrelImport } from './rules/no-barrel-import';
import { preferTreeShakeableImports } from './rules/prefer-tree-shakeable-imports';
import { preferDirectImport } from './rules/prefer-direct-import';
import { noFullPackageImport } from './rules/no-full-package-import';

// Enterprise Governance Rules (Phase 4)
import { enforceTeamBoundaries } from './rules/enforce-team-boundaries';
import { noLegacyImports } from './rules/no-legacy-imports';

/**
 * Collection of all ESLint rules provided by this plugin
 * Full backwards compatibility with eslint-plugin-import
 */
export const rules = {
  // Module Resolution Rules
  'no-duplicates': noDuplicates,
  named: named,
  default: defaultRule,
  namespace: namespace,
  extensions: extensions,
  'no-self-import': noSelfImport,
  'no-unresolved': noUnresolved,
  'no-absolute-path': noAbsolutePath,
  'no-dynamic-require': noDynamicRequire,
  'no-relative-packages': noRelativePackages,
  'no-useless-path-segments': noUselessPathSegments,

  // Module System Rules
  'no-amd': noAmd,
  'no-commonjs': noCommonjs,
  'no-nodejs-modules': noNodejsModules,
  'no-import-module-exports': noImportModuleExports,
  unambiguous: unambiguous,

  // Dependency Boundaries Rules
  'no-cycle': noCycle,
  'no-internal-modules': noInternalModules,
  'no-cross-domain-imports': noCrossDomainImports,
  'enforce-dependency-direction': enforceDependencyDirection,
  'no-restricted-paths': noRestrictedPaths,
  'no-relative-parent-imports': noRelativeParentImports,

  // Export Style Rules
  export: exportRule,
  'no-default-export': noDefaultExport,
  'no-named-export': noNamedExport,
  'prefer-default-export': preferDefaultExport,
  'no-anonymous-default-export': noAnonymousDefaultExport,
  'no-mutable-exports': noMutableExports,
  'no-deprecated': noDeprecated,
  'exports-last': exportsLast,
  'group-exports': groupExports,

  // Import Style Rules
  'enforce-import-order': enforceImportOrder,
  order: enforceImportOrder, // Alias for backwards compat with eslint-plugin-import
  'no-unassigned-import': noUnassignedImport,
  first: first,
  'newline-after-import': newlineAfterImport,
  'no-empty-named-blocks': noEmptyNamedBlocks,
  'no-named-as-default': noNamedAsDefault,
  'no-named-as-default-member': noNamedAsDefaultMember,
  'no-named-default': noNamedDefault,
  'no-namespace': noNamespace,
  'consistent-type-specifier-style': consistentTypeSpecifierStyle,
  'dynamic-import-chunkname': dynamicImportChunkname,

  // Dependency Management Rules
  'no-extraneous-dependencies': noExtraneousDependencies,
  'no-unused-modules': noUnusedModules,
  'max-dependencies': maxDependencies,
  'prefer-node-protocol': preferNodeProtocol,

  // Bundle Optimization Rules (Phase 2)
  'no-barrel-file': noBarrelFile,
  'no-barrel-import': noBarrelImport,
  'prefer-tree-shakeable-imports': preferTreeShakeableImports,
  'prefer-direct-import': preferDirectImport,
  'no-full-package-import': noFullPackageImport,

  // Enterprise Governance Rules (Phase 4)
  'enforce-team-boundaries': enforceTeamBoundaries,
  'no-legacy-imports': noLegacyImports,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object following the official plugin structure
 */
export const plugin = {
  meta: {
    name: 'eslint-plugin-import-next',
    version: '2.0.0',
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
      'import-next': plugin,
    },
    rules: {
      // Module Resolution - Critical
      'import-next/no-unresolved': 'error',
      'import-next/named': 'error',
      'import-next/default': 'error',
      'import-next/namespace': 'warn',
      'import-next/no-duplicates': 'error',
      'import-next/export': 'error',

      // Dependency Boundaries - Critical
      'import-next/no-cycle': 'error',
      'import-next/no-self-import': 'error',

      // Helpful Warnings
      'import-next/no-named-as-default': 'warn',
      'import-next/no-named-as-default-member': 'warn',

      // Module System - Recommended
      'import-next/no-amd': 'warn',

      // Import Style - Recommended
      'import-next/order': 'warn',
      'import-next/first': 'warn',
      'import-next/newline-after-import': 'warn',
      'import-next/no-empty-named-blocks': 'warn',

      // Dependency Management
      'import-next/no-extraneous-dependencies': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict configuration for maximum enforcement
   *
   * All rules set to error for production-ready code
   */
  strict: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      // Module Resolution
      'import-next/no-unresolved': 'error',
      'import-next/named': 'error',
      'import-next/default': 'error',
      'import-next/namespace': 'error',
      'import-next/extensions': 'error',
      'import-next/no-self-import': 'error',
      'import-next/no-duplicates': 'error',
      'import-next/no-absolute-path': 'error',
      'import-next/no-dynamic-require': 'error',
      'import-next/no-useless-path-segments': 'error',
      'import-next/export': 'error',

      // Module System
      'import-next/no-amd': 'error',
      'import-next/no-commonjs': 'error',
      'import-next/no-nodejs-modules': 'error',
      'import-next/no-import-module-exports': 'error',
      'import-next/unambiguous': 'error',

      // Dependency Boundaries
      'import-next/no-cycle': 'error',
      'import-next/no-internal-modules': 'error',
      'import-next/no-cross-domain-imports': 'error',
      'import-next/enforce-dependency-direction': 'error',
      'import-next/no-restricted-paths': 'error',
      'import-next/no-relative-parent-imports': 'error',
      'import-next/no-relative-packages': 'error',

      // Export Style
      'import-next/no-anonymous-default-export': 'error',
      'import-next/no-mutable-exports': 'error',
      'import-next/no-deprecated': 'error',
      'import-next/exports-last': 'error',
      'import-next/group-exports': 'error',

      // Import Style
      'import-next/order': 'error',
      'import-next/no-unassigned-import': 'error',
      'import-next/first': 'error',
      'import-next/newline-after-import': 'error',
      'import-next/no-empty-named-blocks': 'error',
      'import-next/no-named-as-default': 'error',
      'import-next/no-named-as-default-member': 'error',
      'import-next/no-named-default': 'error',
      'import-next/no-namespace': 'error',
      'import-next/consistent-type-specifier-style': 'error',

      // Dependency Management
      'import-next/no-extraneous-dependencies': 'error',
      'import-next/no-unused-modules': 'error',
      'import-next/max-dependencies': 'error',
      'import-next/prefer-node-protocol': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * TypeScript configuration
   *
   * Optimized for TypeScript projects
   */
  typescript: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-unresolved': 'error',
      'import-next/named': 'off', // TypeScript handles this
      'import-next/default': 'error',
      'import-next/namespace': 'error',
      'import-next/export': 'error',
      'import-next/no-cycle': 'error',
      'import-next/no-duplicates': 'error',
      'import-next/order': 'warn',
      'import-next/first': 'warn',
      'import-next/newline-after-import': 'warn',
      'import-next/consistent-type-specifier-style': ['warn', 'prefer-inline'],
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Module resolution focused configuration
   *
   * Ensures all imports resolve correctly
   */
  'module-resolution': {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-unresolved': 'error',
      'import-next/named': 'error',
      'import-next/default': 'error',
      'import-next/namespace': 'error',
      'import-next/extensions': 'warn',
      'import-next/no-self-import': 'error',
      'import-next/no-duplicates': 'error',
      'import-next/no-absolute-path': 'error',
      'import-next/no-useless-path-segments': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Import style focused configuration
   *
   * Enforces consistent import formatting
   */
  'import-style': {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/order': 'error',
      'import-next/first': 'error',
      'import-next/newline-after-import': 'error',
      'import-next/no-duplicates': 'error',
      'import-next/no-unassigned-import': 'warn',
      'import-next/no-empty-named-blocks': 'error',
      'import-next/no-namespace': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * ESM-only configuration
   *
   * Enforces ES Modules and prohibits CommonJS/AMD
   */
  esm: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-amd': 'error',
      'import-next/no-commonjs': 'error',
      'import-next/no-import-module-exports': 'error',
      'import-next/unambiguous': 'error',
      'import-next/prefer-node-protocol': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Architecture boundaries configuration
   *
   * Enforces clean architecture and module boundaries
   */
  architecture: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-cycle': 'error',
      'import-next/no-internal-modules': 'error',
      'import-next/no-cross-domain-imports': 'error',
      'import-next/enforce-dependency-direction': 'error',
      'import-next/no-restricted-paths': 'error',
      'import-next/no-relative-parent-imports': 'warn',
      'import-next/no-relative-packages': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Errors-only configuration (matches eslint-plugin-import)
   */
  errors: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-unresolved': 'error',
      'import-next/named': 'error',
      'import-next/default': 'error',
      'import-next/namespace': 'error',
      'import-next/export': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Warnings-only configuration (matches eslint-plugin-import)
   */
  warnings: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      'import-next/no-named-as-default': 'warn',
      'import-next/no-named-as-default-member': 'warn',
      'import-next/no-duplicates': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Performance optimization configuration (Phase 2)
   *
   * Detects import patterns that harm build performance and tree-shaking:
   * - Barrel files that bloat bundles
   * - Imports from barrel files
   * - Non-tree-shakeable import patterns (namespace imports)
   *
   * Real-world impact:
   * - Atlassian reduced Jira build times by 75%
   * - Bundle size reductions of 50-85%
   *
   * @see https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/
   */
  performance: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      // Bundle Optimization - Critical
      'import-next/no-barrel-file': 'error',
      'import-next/no-barrel-import': 'warn',
      'import-next/prefer-tree-shakeable-imports': 'warn',
      'import-next/prefer-direct-import': 'warn',
      'import-next/no-full-package-import': 'warn',

      // Dependency Boundaries - Impact on build graph
      'import-next/no-cycle': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Enterprise governance configuration (Phase 4)
   *
   * Rules designed for large organizations (1000+ developers):
   * - Team boundaries to prevent unauthorized cross-team imports
   * - Legacy import detection for migration tracking
   *
   * Note: These rules require configuration. See documentation for examples.
   *
   * @example
   * // eslint.config.js
   * {
   *   plugins: { 'import-next': importNext },
   *   rules: {
   *     'import-next/enforce-team-boundaries': ['error', {
   *       teams: [
   *         { team: 'platform', paths: ['src/platform/**'], allowedDependencies: ['shared'] },
   *         { team: 'payments', paths: ['src/payments/**'], allowedDependencies: ['platform', 'shared'] },
   *       ],
   *     }],
   *     'import-next/no-legacy-imports': ['warn', {
   *       mappings: [
   *         { deprecated: 'moment', replacement: 'date-fns', reason: 'moment is in maintenance mode' },
   *       ],
   *     }],
   *   },
   * }
   */
  enterprise: {
    plugins: {
      'import-next': plugin,
    },
    rules: {
      // Team boundaries - requires configuration
      'import-next/enforce-team-boundaries': 'off', // Disabled by default - requires teams config

      // Legacy import tracking - requires configuration
      'import-next/no-legacy-imports': 'off', // Disabled by default - requires mappings config

      // Architecture boundaries
      'import-next/no-cross-domain-imports': 'warn',
      'import-next/enforce-dependency-direction': 'warn',
      'import-next/no-internal-modules': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

// Re-export utility for clearing circular dependency cache
export { clearCircularDependencyCache };

// Default export for ESLint flat config
export default plugin;
