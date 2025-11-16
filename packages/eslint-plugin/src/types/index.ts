/**
 * ESLint Plugin Type Exports
 * 
 * Barrel file that exports all rule Options types with consistent naming:
 * <RuleName>Options
 * 
 * Usage:
 * ```typescript
 * import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin/types';
 * 
 * const config: ReactNoInlineFunctionsOptions = {
 *   allowInEventHandlers: true,
 *   minArraySize: 20,
 * };
 * ```
 */

// Accessibility
import type { Options as ImgRequiresAltOptions } from '../rules/accessibility/img-requires-alt';

// Architecture
import type { Options as NoCircularDependenciesOptions } from '../rules/architecture/no-circular-dependencies';
import type { Options as NoInternalModulesOptions } from '../rules/architecture/no-internal-modules';

// Complexity
import type { Options as CognitiveComplexityOptions } from '../rules/complexity/cognitive-complexity';

// Deprecation
import type { Options as NoDeprecatedApiOptions } from '../rules/deprecation/no-deprecated-api';

// Development
import type { Options as NoConsoleLogOptions } from '../rules/development/no-console-log';
import type { Options as PreferDependencyVersionStrategyOptions } from '../rules/development/prefer-dependency-version-strategy';

// Domain
import type { Options as EnforceNamingOptions } from '../rules/domain/enforce-naming';

// Duplication
import type { Options as IdenticalFunctionsOptions } from '../rules/duplication/identical-functions';

// Migration
import type { Options as ReactClassToHooksOptions } from '../rules/migration/react-class-to-hooks';

// Performance
import type { Options as ReactNoInlineFunctionsOptions } from '../rules/performance/react-no-inline-functions';

// React
import type { Options as RequiredAttributesOptions } from '../rules/react/required-attributes';

// Security
import type { Options as DatabaseInjectionOptions } from '../rules/security/database-injection';
import type { Options as DetectChildProcessOptions } from '../rules/security/detect-child-process';
import type { Options as DetectEvalWithExpressionOptions } from '../rules/security/detect-eval-with-expression';
import type { Options as DetectNonLiteralFsFilenameOptions } from '../rules/security/detect-non-literal-fs-filename';
import type { Options as DetectNonLiteralRegexpOptions } from '../rules/security/detect-non-literal-regexp';
import type { Options as DetectObjectInjectionOptions } from '../rules/security/detect-object-injection';
import type { Options as NoSqlInjectionOptions } from '../rules/security/no-sql-injection';
import type { Options as NoUnsafeDynamicRequireOptions } from '../rules/security/no-unsafe-dynamic-require';
import type { Options as NoHardcodedCredentialsOptions } from '../rules/security/no-hardcoded-credentials';
import type { Options as NoWeakCryptoOptions } from '../rules/security/no-weak-crypto';
import type { Options as NoInsufficientRandomOptions } from '../rules/security/no-insufficient-random';

// Export all types with consistent naming
export type {
  ImgRequiresAltOptions,
  NoCircularDependenciesOptions,
  NoInternalModulesOptions,
  CognitiveComplexityOptions,
  NoDeprecatedApiOptions,
  NoConsoleLogOptions,
  PreferDependencyVersionStrategyOptions,
  EnforceNamingOptions,
  IdenticalFunctionsOptions,
  ReactClassToHooksOptions,
  ReactNoInlineFunctionsOptions,
  RequiredAttributesOptions,
  DatabaseInjectionOptions,
  DetectChildProcessOptions,
  DetectEvalWithExpressionOptions,
  DetectNonLiteralFsFilenameOptions,
  DetectNonLiteralRegexpOptions,
  DetectObjectInjectionOptions,
  NoSqlInjectionOptions,
  NoUnsafeDynamicRequireOptions,
  NoHardcodedCredentialsOptions,
  NoWeakCryptoOptions,
  NoInsufficientRandomOptions,
};

/**
 * Combined type for all rule options
 * Useful for creating unified configuration objects
 * 
 * @example
 * ```typescript
 * const config: AllRulesOptions = {
 *   'react-no-inline-functions': {
 *     allowInEventHandlers: true,
 *     minArraySize: 20,
 *   },
 *   'no-console-log': {
 *     strategy: 'remove',
 *   },
 * };
 * ```
 */
export type AllRulesOptions = {
  'img-requires-alt'?: ImgRequiresAltOptions;
  'no-circular-dependencies'?: NoCircularDependenciesOptions;
  'no-internal-modules'?: NoInternalModulesOptions;
  'cognitive-complexity'?: CognitiveComplexityOptions;
  'no-deprecated-api'?: NoDeprecatedApiOptions;
  'no-console-log'?: NoConsoleLogOptions;
  'prefer-dependency-version-strategy'?: PreferDependencyVersionStrategyOptions;
  'enforce-naming'?: EnforceNamingOptions;
  'identical-functions'?: IdenticalFunctionsOptions;
  'react-class-to-hooks'?: ReactClassToHooksOptions;
  'react-no-inline-functions'?: ReactNoInlineFunctionsOptions;
  'required-attributes'?: RequiredAttributesOptions;
  'database-injection'?: DatabaseInjectionOptions;
  'detect-child-process'?: DetectChildProcessOptions;
  'detect-eval-with-expression'?: DetectEvalWithExpressionOptions;
  'detect-non-literal-fs-filename'?: DetectNonLiteralFsFilenameOptions;
  'detect-non-literal-regexp'?: DetectNonLiteralRegexpOptions;
  'detect-object-injection'?: DetectObjectInjectionOptions;
  'no-sql-injection'?: NoSqlInjectionOptions;
  'no-unsafe-dynamic-require'?: NoUnsafeDynamicRequireOptions;
  'no-hardcoded-credentials'?: NoHardcodedCredentialsOptions;
  'no-weak-crypto'?: NoWeakCryptoOptions;
  'no-insufficient-random'?: NoInsufficientRandomOptions;
};

