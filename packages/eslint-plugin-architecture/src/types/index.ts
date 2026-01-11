/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Simplified type barrel for eslint-plugin-architecture.
 * Many legacy/moved rules previously referenced here were removed or relocated.
 * To keep the package compiling and avoid broken imports, we provide placeholder
 * option types for consumers. Update with concrete rule option types as needed.
 */

// Generic placeholder type for rule options
type GenericRuleOptions = Record<string, unknown>;

// Architecture (placeholders retained for compatibility)
export type NoExternalApiCallsInUtilsOptions = GenericRuleOptions;
export type ConsistentExistenceIndexCheckOptions = GenericRuleOptions;
export type PreferEventTargetOptions = GenericRuleOptions;
export type PreferAtOptions = GenericRuleOptions;
export type NoUnreadableIifeOptions = GenericRuleOptions;
export type NoAwaitInLoopOptions = GenericRuleOptions;

// Complexity
export type CognitiveComplexityOptions = GenericRuleOptions;
export type NestedComplexityHotspotsOptions = GenericRuleOptions;

// Deprecation
export type NoDeprecatedApiOptions = GenericRuleOptions;

// Development
export type NoConsoleLogOptions = GenericRuleOptions;
export type PreferDependencyVersionStrategyOptions = GenericRuleOptions;

// Domain
export type EnforceNamingOptions = GenericRuleOptions;

// DDD
export type DddAnemicDomainModelOptions = GenericRuleOptions;
export type DddValueObjectImmutabilityOptions = GenericRuleOptions;

// Duplication
export type IdenticalFunctionsOptions = GenericRuleOptions;

// Migration
export type ReactClassToHooksOptions = GenericRuleOptions;

// Performance
export type ReactNoInlineFunctionsOptions = GenericRuleOptions;
export type NoBlockingOperationsOptions = GenericRuleOptions;
export type NoMemoryLeakListenersOptions = GenericRuleOptions;
export type NoUnboundedCacheOptions = GenericRuleOptions;
export type NoUnnecessaryRerendersOptions = GenericRuleOptions;
export type DetectNPlusOneQueriesOptions = GenericRuleOptions;
export type ReactRenderOptimizationOptions = GenericRuleOptions;

// API
export type EnforceRestConventionsOptions = GenericRuleOptions;

// React
export type RequiredAttributesOptions = GenericRuleOptions;
export type JsxKeyOptions = GenericRuleOptions;
export type NoDirectMutationStateOptions = GenericRuleOptions;
export type RequireOptimizationOptions = GenericRuleOptions;

// Quality
export type NoCommentedCodeOptions = GenericRuleOptions;
export type MaxParametersOptions = GenericRuleOptions;
export type NoMissingNullChecksOptions = GenericRuleOptions;
export type NoUnsafeTypeNarrowingOptions = GenericRuleOptions;

// Error handling
export type NoUnhandledPromiseOptions = GenericRuleOptions;
export type NoSilentErrorsOptions = GenericRuleOptions;
export type NoMissingErrorContextOptions = GenericRuleOptions;

/**
 * Combined type for all rule options (placeholder).
 * Extend with concrete rule option shapes as rules are added.
 */
export type AllRulesOptions = Record<string, GenericRuleOptions>;
