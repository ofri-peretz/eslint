/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Plugin Dependencies - Type Exports
 *
 * Barrel file that exports all rule Options types with consistent naming.
 */

// Dependency Boundaries
import type { Options as NoCycleOptions } from '../rules/no-cycle';
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
  NoCycleOptions,
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
