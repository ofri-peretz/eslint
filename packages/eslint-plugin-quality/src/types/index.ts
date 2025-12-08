/**
 * ESLint Plugin Type Exports
 * 
 * Barrel file that exports all rule Options types with consistent naming:
 * <RuleName>Options
 * 
 * Note: Security rule types have been moved to eslint-plugin-secure-coding package.
 * Note: Accessibility rule types have been moved to eslint-plugin-react-a11y package.
 * Note: Import/dependency rule types have been moved to eslint-plugin-dependencies package.
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

// Architecture (remaining rules after moving dependencies)
import type { Options as NoExternalApiCallsInUtilsOptions } from '../rules/architecture/no-external-api-calls-in-utils';
import type { Options as ConsistentExistenceIndexCheckOptions } from '../rules/architecture/consistent-existence-index-check';
import type { Options as PreferEventTargetOptions } from '../rules/architecture/prefer-event-target';
import type { Options as PreferAtOptions } from '../rules/architecture/prefer-at';
import type { Options as NoUnreadableIifeOptions } from '../rules/architecture/no-unreadable-iife';
import type { Options as NoAwaitInLoopOptions } from '../rules/architecture/no-await-in-loop';

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

// Quality
import type { Options as NoCommentedCodeOptions } from '../rules/quality/no-commented-code';
import type { Options as MaxParametersOptions } from '../rules/quality/max-parameters';
import type { Options as NoMissingNullChecksOptions } from '../rules/quality/no-missing-null-checks';
import type { Options as NoUnsafeTypeNarrowingOptions } from '../rules/quality/no-unsafe-type-narrowing';

// Error handling
import type { Options as NoUnhandledPromiseOptions } from '../rules/error-handling/no-unhandled-promise';
import type { Options as NoSilentErrorsOptions } from '../rules/error-handling/no-silent-errors';
import type { Options as NoMissingErrorContextOptions } from '../rules/error-handling/no-missing-error-context';

// Export all types with consistent naming
export type {
  // Architecture
  NoExternalApiCallsInUtilsOptions,
  ConsistentExistenceIndexCheckOptions,
  PreferEventTargetOptions,
  PreferAtOptions,
  NoUnreadableIifeOptions,
  NoAwaitInLoopOptions,
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
  // DDD
  DddAnemicDomainModelOptions,
  DddValueObjectImmutabilityOptions,
  // Duplication
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
  // Quality
  NoCommentedCodeOptions,
  MaxParametersOptions,
  NoMissingNullChecksOptions,
  NoUnsafeTypeNarrowingOptions,
  // Error handling
  NoUnhandledPromiseOptions,
  NoSilentErrorsOptions,
  NoMissingErrorContextOptions,
};

/**
 * Combined type for all rule options
 * Useful for creating unified configuration objects
 * 
 * Note: Security rule types have been moved to eslint-plugin-secure-coding package.
 * Note: Accessibility rule types have been moved to eslint-plugin-react-a11y package.
 * Note: Import/dependency rule types have been moved to eslint-plugin-dependencies package.
 */
export type AllRulesOptions = {
  // Architecture
  'no-external-api-calls-in-utils'?: NoExternalApiCallsInUtilsOptions;
  'consistent-existence-index-check'?: ConsistentExistenceIndexCheckOptions;
  'prefer-event-target'?: PreferEventTargetOptions;
  'prefer-at'?: PreferAtOptions;
  'no-unreadable-iife'?: NoUnreadableIifeOptions;
  'no-await-in-loop'?: NoAwaitInLoopOptions;
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
  // Quality
  'no-commented-code'?: NoCommentedCodeOptions;
  'max-parameters'?: MaxParametersOptions;
  'no-missing-null-checks'?: NoMissingNullChecksOptions;
  'no-unsafe-type-narrowing'?: NoUnsafeTypeNarrowingOptions;
  // Error handling
  'no-unhandled-promise'?: NoUnhandledPromiseOptions;
  'no-silent-errors'?: NoSilentErrorsOptions;
  'no-missing-error-context'?: NoMissingErrorContextOptions;
};
