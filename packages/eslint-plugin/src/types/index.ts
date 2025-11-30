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
import type { Options as NoKeyboardInaccessibleElementsOptions } from '../rules/accessibility/no-keyboard-inaccessible-elements';
import type { Options as NoMissingAriaLabelsOptions } from '../rules/accessibility/no-missing-aria-labels';

// Architecture
import type { Options as NoCircularDependenciesOptions } from '../rules/architecture/no-circular-dependencies';
import type { Options as NoInternalModulesOptions } from '../rules/architecture/no-internal-modules';
import type { Options as NoExternalApiCallsInUtilsOptions } from '../rules/architecture/no-external-api-calls-in-utils';
import type { Options as NoCrossDomainImportsOptions } from '../rules/architecture/no-cross-domain-imports';
import type { Options as EnforceDependencyDirectionOptions } from '../rules/architecture/enforce-dependency-direction';
import type { Options as PreferNodeProtocolOptions } from '../rules/architecture/prefer-node-protocol';
import type { Options as ConsistentExistenceIndexCheckOptions } from '../rules/architecture/consistent-existence-index-check';
import type { Options as PreferEventTargetOptions } from '../rules/architecture/prefer-event-target';
import type { Options as PreferAtOptions } from '../rules/architecture/prefer-at';
import type { Options as NoUnreadableIifeOptions } from '../rules/architecture/no-unreadable-iife';
import type { Options as NoAwaitInLoopOptions } from '../rules/architecture/no-await-in-loop';
import type { Options as NoSelfImportOptions } from '../rules/architecture/no-self-import';
import type { Options as NoUnusedModulesOptions } from '../rules/architecture/no-unused-modules';
import type { Options as NoExtraneousDependenciesOptions } from '../rules/architecture/no-extraneous-dependencies';
import type { Options as MaxDependenciesOptions } from '../rules/architecture/max-dependencies';
import type { Options as NoAnonymousDefaultExportOptions } from '../rules/architecture/no-anonymous-default-export';
import type { Options as NoRestrictedPathsOptions } from '../rules/architecture/no-restricted-paths';
import type { Options as NoDeprecatedOptions } from '../rules/architecture/no-deprecated';
import type { Options as NoMutableExportsOptions } from '../rules/architecture/no-mutable-exports';
import type { Options as PreferDefaultExportOptions } from '../rules/architecture/prefer-default-export';

// Complexity
import type { Options as CognitiveComplexityOptions } from '../rules/complexity/cognitive-complexity';
import type { Options as NestedComplexityHotspotsOptions } from '../rules/complexity/nested-complexity-hotspots';

// Deprecation
import type { Options as NoDeprecatedApiOptions } from '../rules/deprecation/no-deprecated-api';

// Development
import type { Options as NoConsoleLogOptions } from '../rules/development/no-console-log';
import type { Options as PreferDependencyVersionStrategyOptions } from '../rules/development/prefer-dependency-version-strategy';

// Domain
import type { Options as EnforceNamingOptions } from '../rules/domain/enforce-naming';

// DDD
import type { Options as DddAnemicDomainModelOptions } from '../rules/ddd/ddd-anemic-domain-model';
import type { Options as DddValueObjectImmutabilityOptions } from '../rules/ddd/ddd-value-object-immutability';

// Duplication
import type { Options as IdenticalFunctionsOptions } from '../rules/duplication/identical-functions';

// Migration
import type { Options as ReactClassToHooksOptions } from '../rules/migration/react-class-to-hooks';

// Performance
import type { Options as ReactNoInlineFunctionsOptions } from '../rules/performance/react-no-inline-functions';
import type { Options as NoBlockingOperationsOptions } from '../rules/performance/no-blocking-operations';
import type { Options as NoMemoryLeakListenersOptions } from '../rules/performance/no-memory-leak-listeners';
import type { Options as NoUnboundedCacheOptions } from '../rules/performance/no-unbounded-cache';
import type { Options as NoUnnecessaryRerendersOptions } from '../rules/performance/no-unnecessary-rerenders';
import type { Options as DetectNPlusOneQueriesOptions } from '../rules/performance/detect-n-plus-one-queries';
import type { Options as ReactRenderOptimizationOptions } from '../rules/performance/react-render-optimization';

// API
import type { Options as EnforceRestConventionsOptions } from '../rules/api/enforce-rest-conventions';

// React
import type { Options as RequiredAttributesOptions } from '../rules/react/required-attributes';
import type { Options as JsxKeyOptions } from '../rules/react/jsx-key';
import type { Options as NoDirectMutationStateOptions } from '../rules/react/no-direct-mutation-state';
import type { Options as RequireOptimizationOptions } from '../rules/react/require-optimization';

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
import type { Options as NoUnvalidatedUserInputOptions } from '../rules/security/no-unvalidated-user-input';
import type { Options as NoUnsanitizedHtmlOptions } from '../rules/security/no-unsanitized-html';
import type { Options as NoUnescapedUrlParameterOptions } from '../rules/security/no-unescaped-url-parameter';
import type { Options as NoMissingCorsCheckOptions } from '../rules/security/no-missing-cors-check';
import type { Options as NoInsecureComparisonOptions } from '../rules/security/no-insecure-comparison';
import type { Options as NoMissingAuthenticationOptions } from '../rules/security/no-missing-authentication';
import type { Options as NoPrivilegeEscalationOptions } from '../rules/security/no-privilege-escalation';
import type { Options as NoRedosVulnerableRegexOptions } from '../rules/security/no-redos-vulnerable-regex';
import type { Options as NoUnsafeRegexConstructionOptions } from '../rules/security/no-unsafe-regex-construction';
import type { Options as NoSensitiveDataExposureOptions } from '../rules/security/no-sensitive-data-exposure';
import type { Options as NoToctouVulnerabilityOptions } from '../rules/security/no-toctou-vulnerability';
import type { Options as NoMissingSecurityHeadersOptions } from '../rules/security/no-missing-security-headers';
import type { Options as NoInsecureRedirectsOptions } from '../rules/security/no-insecure-redirects';
import type { Options as NoExposedSensitiveDataOptions } from '../rules/security/no-exposed-sensitive-data';
import type { Options as NoMissingCsrfProtectionOptions } from '../rules/security/no-missing-csrf-protection';
import type { Options as NoUnencryptedTransmissionOptions } from '../rules/security/no-unencrypted-transmission';
import type { Options as NoInsecureCookieSettingsOptions } from '../rules/security/no-insecure-cookie-settings';
// Quality
import type { Options as NoCommentedCodeOptions } from '../rules/quality/no-commented-code';
import type { Options as MaxParametersOptions } from '../rules/quality/max-parameters';
import type { Options as NoMissingNullChecksOptions } from '../rules/quality/no-missing-null-checks';
import type { Options as NoUnsafeTypeNarrowingOptions } from '../rules/quality/no-unsafe-type-narrowing';
// Error handling
import type { Options as NoUnhandledPromiseOptions } from '../rules/error-handling/no-unhandled-promise';
import type { Options as NoSilentErrorsOptions } from '../rules/error-handling/no-silent-errors';
import type { Options as NoMissingErrorContextOptions } from '../rules/error-handling/no-missing-error-context';

// TypeScript
// TypeScript rules removed - use @typescript-eslint/eslint-plugin for proper TypeScript linting

// Export all types with consistent naming
export type {
  // Accessibility
  ImgRequiresAltOptions,
  NoKeyboardInaccessibleElementsOptions,
  NoMissingAriaLabelsOptions,
  // Architecture
  NoCircularDependenciesOptions,
  NoInternalModulesOptions,
  NoExternalApiCallsInUtilsOptions,
  NoCrossDomainImportsOptions,
  EnforceDependencyDirectionOptions,
  PreferNodeProtocolOptions,
  ConsistentExistenceIndexCheckOptions,
  PreferEventTargetOptions,
  PreferAtOptions,
  NoUnreadableIifeOptions,
  NoAwaitInLoopOptions,
  NoSelfImportOptions,
  NoUnusedModulesOptions,
  NoExtraneousDependenciesOptions,
  MaxDependenciesOptions,
  NoAnonymousDefaultExportOptions,
  NoRestrictedPathsOptions,
  NoDeprecatedOptions,
  NoMutableExportsOptions,
  PreferDefaultExportOptions,
  // Complexity
  CognitiveComplexityOptions,
  NestedComplexityHotspotsOptions,
  // Deprecation
  NoDeprecatedApiOptions,
  // Development
  NoConsoleLogOptions,
  PreferDependencyVersionStrategyOptions,
  // Domain
  EnforceNamingOptions,
  // Duplication
  DddAnemicDomainModelOptions,
  DddValueObjectImmutabilityOptions,
  IdenticalFunctionsOptions,
  // Migration
  ReactClassToHooksOptions,
  // Performance
  ReactNoInlineFunctionsOptions,
  NoBlockingOperationsOptions,
  NoMemoryLeakListenersOptions,
  NoUnboundedCacheOptions,
  NoUnnecessaryRerendersOptions,
  DetectNPlusOneQueriesOptions,
  ReactRenderOptimizationOptions,
  // API
  EnforceRestConventionsOptions,
  // React
  RequiredAttributesOptions,
  JsxKeyOptions,
  NoDirectMutationStateOptions,
  RequireOptimizationOptions,
  // Security
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
  NoUnvalidatedUserInputOptions,
  NoUnsanitizedHtmlOptions,
  NoUnescapedUrlParameterOptions,
  NoMissingCorsCheckOptions,
  NoInsecureComparisonOptions,
  NoMissingAuthenticationOptions,
  NoPrivilegeEscalationOptions,
  NoRedosVulnerableRegexOptions,
  NoUnsafeRegexConstructionOptions,
  NoSensitiveDataExposureOptions,
  NoToctouVulnerabilityOptions,
  NoMissingSecurityHeadersOptions,
  NoInsecureRedirectsOptions,
  NoExposedSensitiveDataOptions,
  NoMissingCsrfProtectionOptions,
  NoUnencryptedTransmissionOptions,
  NoInsecureCookieSettingsOptions,
  // Quality
  NoCommentedCodeOptions,
  MaxParametersOptions,
  NoMissingNullChecksOptions,
  NoUnsafeTypeNarrowingOptions,
  // Error handling
  NoUnhandledPromiseOptions,
  NoSilentErrorsOptions,
  NoMissingErrorContextOptions,
  // TypeScript
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
  // Accessibility
  'img-requires-alt'?: ImgRequiresAltOptions;
  'no-keyboard-inaccessible-elements'?: NoKeyboardInaccessibleElementsOptions;
  'no-missing-aria-labels'?: NoMissingAriaLabelsOptions;
  // Architecture
  'no-circular-dependencies'?: NoCircularDependenciesOptions;
  'no-internal-modules'?: NoInternalModulesOptions;
  'no-external-api-calls-in-utils'?: NoExternalApiCallsInUtilsOptions;
  'no-cross-domain-imports'?: NoCrossDomainImportsOptions;
  'enforce-dependency-direction'?: EnforceDependencyDirectionOptions;
  'prefer-node-protocol'?: PreferNodeProtocolOptions;
  'consistent-existence-index-check'?: ConsistentExistenceIndexCheckOptions;
  'prefer-event-target'?: PreferEventTargetOptions;
  'prefer-at'?: PreferAtOptions;
  'no-unreadable-iife'?: NoUnreadableIifeOptions;
  'no-await-in-loop'?: NoAwaitInLoopOptions;
  'no-self-import'?: NoSelfImportOptions;
  'no-unused-modules'?: NoUnusedModulesOptions;
  'no-extraneous-dependencies'?: NoExtraneousDependenciesOptions;
  'max-dependencies'?: MaxDependenciesOptions;
  'no-anonymous-default-export'?: NoAnonymousDefaultExportOptions;
  'no-restricted-paths'?: NoRestrictedPathsOptions;
  'no-deprecated'?: NoDeprecatedOptions;
  'no-mutable-exports'?: NoMutableExportsOptions;
  'prefer-default-export'?: PreferDefaultExportOptions;
  // Complexity
  'cognitive-complexity'?: CognitiveComplexityOptions;
  // Deprecation
  'no-deprecated-api'?: NoDeprecatedApiOptions;
  // Development
  'no-console-log'?: NoConsoleLogOptions;
  'prefer-dependency-version-strategy'?: PreferDependencyVersionStrategyOptions;
  // Domain
  'enforce-naming'?: EnforceNamingOptions;
  // Duplication
  'identical-functions'?: IdenticalFunctionsOptions;
  // Migration
  'react-class-to-hooks'?: ReactClassToHooksOptions;
  // Performance
  'react-no-inline-functions'?: ReactNoInlineFunctionsOptions;
  'no-blocking-operations'?: NoBlockingOperationsOptions;
  'no-memory-leak-listeners'?: NoMemoryLeakListenersOptions;
  'no-unbounded-cache'?: NoUnboundedCacheOptions;
  'no-unnecessary-rerenders'?: NoUnnecessaryRerendersOptions;
  'detect-n-plus-one-queries'?: DetectNPlusOneQueriesOptions;
  'react-render-optimization'?: ReactRenderOptimizationOptions;
  // React
  'required-attributes'?: RequiredAttributesOptions;
  'jsx-key'?: JsxKeyOptions;
  'no-direct-mutation-state'?: NoDirectMutationStateOptions;
  'require-optimization'?: RequireOptimizationOptions;
  // Security
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
  'no-unvalidated-user-input'?: NoUnvalidatedUserInputOptions;
  'no-unsanitized-html'?: NoUnsanitizedHtmlOptions;
  'no-unescaped-url-parameter'?: NoUnescapedUrlParameterOptions;
  'no-missing-cors-check'?: NoMissingCorsCheckOptions;
  'no-insecure-comparison'?: NoInsecureComparisonOptions;
  'no-missing-authentication'?: NoMissingAuthenticationOptions;
  'no-privilege-escalation'?: NoPrivilegeEscalationOptions;
  'no-redos-vulnerable-regex'?: NoRedosVulnerableRegexOptions;
  'no-unsafe-regex-construction'?: NoUnsafeRegexConstructionOptions;
  'no-sensitive-data-exposure'?: NoSensitiveDataExposureOptions;
  'no-toctou-vulnerability'?: NoToctouVulnerabilityOptions;
  'no-missing-security-headers'?: NoMissingSecurityHeadersOptions;
  'no-insecure-redirects'?: NoInsecureRedirectsOptions;
  'no-exposed-sensitive-data'?: NoExposedSensitiveDataOptions;
  'no-missing-csrf-protection'?: NoMissingCsrfProtectionOptions;
  'no-unencrypted-transmission'?: NoUnencryptedTransmissionOptions;
  'no-insecure-cookie-settings'?: NoInsecureCookieSettingsOptions;
  // Quality
  'no-commented-code'?: NoCommentedCodeOptions;
  'max-parameters'?: MaxParametersOptions;
  'no-missing-null-checks'?: NoMissingNullChecksOptions;
  'no-unsafe-type-narrowing'?: NoUnsafeTypeNarrowingOptions;
  // Error handling
  'no-unhandled-promise'?: NoUnhandledPromiseOptions;
  'no-silent-errors'?: NoSilentErrorsOptions;
  'no-missing-error-context'?: NoMissingErrorContextOptions;
  // TypeScript
};

