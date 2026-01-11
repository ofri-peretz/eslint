/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-mongodb-security Type Exports
 *
 * Barrel file that exports all MongoDB security rule Options types.
 *
 * Usage:
 * ```typescript
 * import type { NoUnsafeQueryOptions } from 'eslint-plugin-mongodb-security/types';
 * ```
 */

// Critical - NoSQL Injection
import type { Options as NoUnsafeQueryOptions } from '../rules/no-unsafe-query';
import type { Options as NoOperatorInjectionOptions } from '../rules/no-operator-injection';
import type { Options as NoUnsafeWhereOptions } from '../rules/no-unsafe-where';
import type { Options as NoUnsafeRegexQueryOptions } from '../rules/no-unsafe-regex-query';

// High - Credentials & Connection
import type { Options as NoHardcodedConnectionStringOptions } from '../rules/no-hardcoded-connection-string';
import type { Options as NoHardcodedCredentialsOptions } from '../rules/no-hardcoded-credentials';
import type { Options as RequireTlsConnectionOptions } from '../rules/require-tls-connection';
import type { Options as RequireAuthMechanismOptions } from '../rules/require-auth-mechanism';

// Medium - Mongoose ODM
import type { Options as RequireSchemaValidationOptions } from '../rules/require-schema-validation';
import type { Options as NoSelectSensitiveFieldsOptions } from '../rules/no-select-sensitive-fields';
import type { Options as NoBypassMiddlewareOptions } from '../rules/no-bypass-middleware';
import type { Options as NoUnsafePopulateOptions } from '../rules/no-unsafe-populate';

// Low - Best Practices
import type { Options as NoUnboundedFindOptions } from '../rules/no-unbounded-find';
import type { Options as RequireProjectionOptions } from '../rules/require-projection';
import type { Options as RequireLeanQueriesOptions } from '../rules/require-lean-queries';
import type { Options as NoDebugModeProductionOptions } from '../rules/no-debug-mode-production';

// Export all types
export type {
  // Critical - NoSQL Injection
  NoUnsafeQueryOptions,
  NoOperatorInjectionOptions,
  NoUnsafeWhereOptions,
  NoUnsafeRegexQueryOptions,
  // High - Credentials & Connection
  NoHardcodedConnectionStringOptions,
  NoHardcodedCredentialsOptions,
  RequireTlsConnectionOptions,
  RequireAuthMechanismOptions,
  // Medium - Mongoose ODM
  RequireSchemaValidationOptions,
  NoSelectSensitiveFieldsOptions,
  NoBypassMiddlewareOptions,
  NoUnsafePopulateOptions,
  // Low - Best Practices
  NoUnboundedFindOptions,
  RequireProjectionOptions,
  RequireLeanQueriesOptions,
  NoDebugModeProductionOptions,
};

/**
 * Combined type for all MongoDB security rule options
 */
export type AllMongoDBSecurityRulesOptions = {
  // Critical - NoSQL Injection
  'no-unsafe-query'?: NoUnsafeQueryOptions;
  'no-operator-injection'?: NoOperatorInjectionOptions;
  'no-unsafe-where'?: NoUnsafeWhereOptions;
  'no-unsafe-regex-query'?: NoUnsafeRegexQueryOptions;
  // High - Credentials & Connection
  'no-hardcoded-connection-string'?: NoHardcodedConnectionStringOptions;
  'no-hardcoded-credentials'?: NoHardcodedCredentialsOptions;
  'require-tls-connection'?: RequireTlsConnectionOptions;
  'require-auth-mechanism'?: RequireAuthMechanismOptions;
  // Medium - Mongoose ODM
  'require-schema-validation'?: RequireSchemaValidationOptions;
  'no-select-sensitive-fields'?: NoSelectSensitiveFieldsOptions;
  'no-bypass-middleware'?: NoBypassMiddlewareOptions;
  'no-unsafe-populate'?: NoUnsafePopulateOptions;
  // Low - Best Practices
  'no-unbounded-find'?: NoUnboundedFindOptions;
  'require-projection'?: RequireProjectionOptions;
  'require-lean-queries'?: RequireLeanQueriesOptions;
  'no-debug-mode-production'?: NoDebugModeProductionOptions;
};
