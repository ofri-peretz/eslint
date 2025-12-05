/**
 * ESLint Plugin Dependencies - Type Exports
 *
 * Barrel file that exports all rule Options types with consistent naming.
 */

// Dependency Boundaries
import type { Options as NoCircularDependenciesOptions } from '../rules/no-circular-dependencies';
import type { Options as NoInternalModulesOptions } from '../rules/no-internal-modules';
import type { Options as NoCrossDomainImportsOptions } from '../rules/no-cross-domain-imports';
import type { Options as EnforceDependencyDirectionOptions } from '../rules/enforce-dependency-direction';
import type { Options as NoRestrictedPathsOptions } from '../rules/no-restricted-paths';

// Export Style
import type { Options as NoAnonymousDefaultExportOptions } from '../rules/no-anonymous-default-export';
import type { Options as NoDeprecatedOptions } from '../rules/no-deprecated';
import type { Options as NoMutableExportsOptions } from '../rules/no-mutable-exports';
import type { Options as PreferDefaultExportOptions } from '../rules/prefer-default-export';

// Import Style
import type { Options as EnforceImportOrderOptions } from '../rules/enforce-import-order';

// Dependency Management
import type { Options as NoExtraneousDependenciesOptions } from '../rules/no-extraneous-dependencies';
import type { Options as NoUnusedModulesOptions } from '../rules/no-unused-modules';
import type { Options as MaxDependenciesOptions } from '../rules/max-dependencies';
import type { Options as PreferNodeProtocolOptions } from '../rules/prefer-node-protocol';

// Export all types
export type {
  NoCircularDependenciesOptions,
  NoInternalModulesOptions,
  NoCrossDomainImportsOptions,
  EnforceDependencyDirectionOptions,
  NoRestrictedPathsOptions,
  NoAnonymousDefaultExportOptions,
  NoDeprecatedOptions,
  NoMutableExportsOptions,
  PreferDefaultExportOptions,
  EnforceImportOrderOptions,
  NoExtraneousDependenciesOptions,
  NoUnusedModulesOptions,
  MaxDependenciesOptions,
  PreferNodeProtocolOptions,
};
