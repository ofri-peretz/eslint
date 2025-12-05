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

import type { TSESLint } from '@interlace/eslint-devkit';

// Development rules
import { noConsoleLog } from './rules/development/no-console-log';
import { preferDependencyVersionStrategy } from './rules/development/prefer-dependency-version-strategy';
import { noProcessExit } from './rules/development/no-process-exit';
import { noConsoleSpaces } from './rules/development/no-console-spaces';

// Architecture rules
// Note: Import/dependency rules have been moved to eslint-plugin-dependencies package.
import { consistentExistenceIndexCheck } from './rules/architecture/consistent-existence-index-check';
import { preferEventTarget } from './rules/architecture/prefer-event-target';
import { preferAt } from './rules/architecture/prefer-at';
import { noUnreadableIife } from './rules/architecture/no-unreadable-iife';
import { noAwaitInLoop } from './rules/architecture/no-await-in-loop';
import { noExternalApiCallsInUtils } from './rules/architecture/no-external-api-calls-in-utils';
import { consistentFunctionScoping } from './rules/architecture/consistent-function-scoping';
import { filenameCase } from './rules/architecture/filename-case';
import { noInstanceofArray } from './rules/architecture/no-instanceof-array';

// Quality rules
import { noCommentedCode } from './rules/quality/no-commented-code';
import { maxParameters } from './rules/quality/max-parameters';
import { noMissingNullChecks } from './rules/quality/no-missing-null-checks';
import { noUnsafeTypeNarrowing } from './rules/quality/no-unsafe-type-narrowing';
import { expiringTodoComments } from './rules/quality/expiring-todo-comments';
import { noLonelyIf } from './rules/quality/no-lonely-if';
import { noNestedTernary } from './rules/quality/no-nested-ternary';
import { preferCodePoint } from './rules/quality/prefer-code-point';
import { preferDomNodeTextContent } from './rules/quality/prefer-dom-node-text-content';

// Error handling rules
import { noUnhandledPromise } from './rules/error-handling/no-unhandled-promise';
import { noSilentErrors } from './rules/error-handling/no-silent-errors';
import { noMissingErrorContext } from './rules/error-handling/no-missing-error-context';
import { errorMessage } from './rules/error-handling/error-message';

// Performance rules
import { noUnnecessaryRerenders } from './rules/performance/no-unnecessary-rerenders';
import { noMemoryLeakListeners } from './rules/performance/no-memory-leak-listeners';
import { noBlockingOperations } from './rules/performance/no-blocking-operations';
import { noUnboundedCache } from './rules/performance/no-unbounded-cache';
import { detectNPlusOneQueries } from './rules/performance/detect-n-plus-one-queries';
import { reactRenderOptimization } from './rules/performance/react-render-optimization';
import { reactNoInlineFunctions } from './rules/performance/react-no-inline-functions';

// Note: Accessibility rules have been moved to eslint-plugin-react-a11y package.
// Use that package for accessibility-focused configurations.

// Migration rules
import { reactClassToHooks } from './rules/migration/react-class-to-hooks';

// API rules
import { enforceRestConventions } from './rules/api/enforce-rest-conventions';

// React rules
import { requiredAttributes } from './rules/react/required-attributes';
import { jsxKey } from './rules/react/jsx-key';
import { noDirectMutationState } from './rules/react/no-direct-mutation-state';
import { requireOptimization } from './rules/react/require-optimization';
import { noSetState } from './rules/react/no-set-state';
import { noThisInSfc } from './rules/react/no-this-in-sfc';
import { noAccessStateInSetState } from './rules/react/no-access-state-in-setstate';
import { noChildrenProp } from './rules/react/no-children-prop';
import { noDanger } from './rules/react/no-danger';
import { noStringRefs } from './rules/react/no-string-refs';
import { noUnknownProperty } from './rules/react/no-unknown-property';
import { checkedRequiresOnchangeOrReadonly } from './rules/react/checked-requires-onchange-or-readonly';
import { defaultPropsMatchPropTypes } from './rules/react/default-props-match-prop-types';
import { displayName } from './rules/react/display-name';
import { jsxHandlerNames } from './rules/react/jsx-handler-names';
import { jsxMaxDepth } from './rules/react/jsx-max-depth';
import { jsxNoBind } from './rules/react/jsx-no-bind';
import { jsxNoLiterals } from './rules/react/jsx-no-literals';
import { noAdjacentInlineElements } from './rules/react/no-adjacent-inline-elements';
import { noArrowFunctionLifecycle } from './rules/react/no-arrow-function-lifecycle';
import { noDidMountSetState } from './rules/react/no-did-mount-set-state';
import { noDidUpdateSetState } from './rules/react/no-did-update-set-state';
import { noInvalidHtmlAttribute } from './rules/react/no-invalid-html-attribute';
import { noIsMounted } from './rules/react/no-is-mounted';
import { noMultiComp } from './rules/react/no-multi-comp';
import { noNamespace } from './rules/react/no-namespace';
import { noObjectTypeAsDefaultProp } from './rules/react/no-object-type-as-default-prop';
import { noRedundantShouldComponentUpdate } from './rules/react/no-redundant-should-component-update';
import { noRenderReturnValue } from './rules/react/no-render-return-value';
import { noTypos } from './rules/react/no-typos';
import { noUnescapedEntities } from './rules/react/no-unescaped-entities';
import { preferEs6Class } from './rules/react/prefer-es6-class';
import { preferStatelessFunction } from './rules/react/prefer-stateless-function';
import { propTypes } from './rules/react/prop-types';
import { reactInJsxScope } from './rules/react/react-in-jsx-scope';
import { requireDefaultProps } from './rules/react/require-default-props';
import { requireRenderReturn } from './rules/react/require-render-return';
import { sortComp } from './rules/react/sort-comp';
import { stateInConstructor } from './rules/react/state-in-constructor';
import { staticPropertyPlacement } from './rules/react/static-property-placement';
import { hooksExhaustiveDeps } from './rules/react/hooks-exhaustive-deps';

// Deprecation rules
import { noDeprecatedApi } from './rules/deprecation/no-deprecated-api';

// Domain rules
import { enforceNaming } from './rules/domain/enforce-naming';

// Complexity rules
import { cognitiveComplexity } from './rules/complexity/cognitive-complexity';
import { nestedComplexityHotspots } from './rules/complexity/nested-complexity-hotspots';

// DDD rules
import { dddAnemicDomainModel } from './rules/ddd/ddd-anemic-domain-model';
import { dddValueObjectImmutability } from './rules/ddd/ddd-value-object-immutability';

// Duplication rules
import { identicalFunctions } from './rules/duplication/identical-functions';

// Note: Import rules have been moved to eslint-plugin-dependencies package.

/**
 * Collection of all ESLint rules provided by this plugin
 * 
 * Each rule must be created using the `createRule` utility from @interlace/eslint-devkit
 * which ensures proper typing and documentation generation.
 * 
 * Note: Security rules have been moved to eslint-plugin-secure-coding package.
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
  // Note: Import/dependency rules have been moved to eslint-plugin-dependencies package.
  'no-console-log': noConsoleLog,
  'prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'no-process-exit': noProcessExit,
  'no-console-spaces': noConsoleSpaces,
  'no-commented-code': noCommentedCode,
  'max-parameters': maxParameters,
  'expiring-todo-comments': expiringTodoComments,
  'no-lonely-if': noLonelyIf,
  'no-nested-ternary': noNestedTernary,
  'prefer-code-point': preferCodePoint,
  'prefer-dom-node-text-content': preferDomNodeTextContent,
  'no-unhandled-promise': noUnhandledPromise,
  'no-silent-errors': noSilentErrors,
  'no-missing-error-context': noMissingErrorContext,
  'error-message': errorMessage,
  'no-missing-null-checks': noMissingNullChecks,
  'no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'no-unnecessary-rerenders': noUnnecessaryRerenders,
  'no-memory-leak-listeners': noMemoryLeakListeners,
  'no-blocking-operations': noBlockingOperations,
  'no-unbounded-cache': noUnboundedCache,
  'detect-n-plus-one-queries': detectNPlusOneQueries,
  'react-render-optimization': reactRenderOptimization,
  'no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'consistent-existence-index-check': consistentExistenceIndexCheck,
  'prefer-event-target': preferEventTarget,
  'prefer-at': preferAt,
  'consistent-function-scoping': consistentFunctionScoping,
  'filename-case': filenameCase,
  'no-instanceof-array': noInstanceofArray,
  'nested-complexity-hotspots': nestedComplexityHotspots,
  'ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd-value-object-immutability': dddValueObjectImmutability,
  'enforce-rest-conventions': enforceRestConventions,
  'react-class-to-hooks': reactClassToHooks,
  'react-no-inline-functions': reactNoInlineFunctions,
  'required-attributes': requiredAttributes,
  'no-deprecated-api': noDeprecatedApi,
  'enforce-naming': enforceNaming,
  'cognitive-complexity': cognitiveComplexity,
  'identical-functions': identicalFunctions,
  
  // Categorized rule names (for better organization)
  // Note: Import/dependency rules have been moved to eslint-plugin-dependencies package.
  'development/no-console-log': noConsoleLog,
  'development/prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'development/no-process-exit': noProcessExit,
  'development/no-console-spaces': noConsoleSpaces,
  'quality/no-commented-code': noCommentedCode,
  'quality/max-parameters': maxParameters,
  'quality/expiring-todo-comments': expiringTodoComments,
  'quality/no-lonely-if': noLonelyIf,
  'quality/no-nested-ternary': noNestedTernary,
  'quality/prefer-code-point': preferCodePoint,
  'quality/prefer-dom-node-text-content': preferDomNodeTextContent,
  'quality/no-missing-null-checks': noMissingNullChecks,
  'quality/no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'error-handling/no-unhandled-promise': noUnhandledPromise,
  'error-handling/no-silent-errors': noSilentErrors,
  'error-handling/no-missing-error-context': noMissingErrorContext,
  'error-handling/error-message': errorMessage,
  'performance/no-unnecessary-rerenders': noUnnecessaryRerenders,
  'performance/no-memory-leak-listeners': noMemoryLeakListeners,
  'performance/no-blocking-operations': noBlockingOperations,
  'performance/no-unbounded-cache': noUnboundedCache,
  'performance/detect-n-plus-one-queries': detectNPlusOneQueries,
  'performance/react-render-optimization': reactRenderOptimization,
  'architecture/no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'architecture/consistent-existence-index-check': consistentExistenceIndexCheck,
  'architecture/prefer-event-target': preferEventTarget,
  'architecture/prefer-at': preferAt,
  'architecture/consistent-function-scoping': consistentFunctionScoping,
  'architecture/filename-case': filenameCase,
  'architecture/no-instanceof-array': noInstanceofArray,
  'architecture/no-unreadable-iife': noUnreadableIife,
  'architecture/no-await-in-loop': noAwaitInLoop,
  'complexity/nested-complexity-hotspots': nestedComplexityHotspots,
  'ddd/ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd/ddd-value-object-immutability': dddValueObjectImmutability,
  'api/enforce-rest-conventions': enforceRestConventions,
  'migration/react-class-to-hooks': reactClassToHooks,
  'performance/react-no-inline-functions': reactNoInlineFunctions,
  // Note: Accessibility rules have been moved to eslint-plugin-react-a11y package.
  'react/required-attributes': requiredAttributes,
  'react/jsx-key': jsxKey,
  'react/no-direct-mutation-state': noDirectMutationState,
  'react/require-optimization': requireOptimization,
  'react/no-set-state': noSetState,
  'react/no-this-in-sfc': noThisInSfc,
  'react/no-access-state-in-setstate': noAccessStateInSetState,
  'react/no-children-prop': noChildrenProp,
  'react/no-danger': noDanger,
  'react/no-string-refs': noStringRefs,
  'react/no-unknown-property': noUnknownProperty,
  'react/checked-requires-onchange-or-readonly': checkedRequiresOnchangeOrReadonly,
  'react/default-props-match-prop-types': defaultPropsMatchPropTypes,
  'react/display-name': displayName,
  'react/jsx-handler-names': jsxHandlerNames,
  'react/jsx-max-depth': jsxMaxDepth,
  'react/jsx-no-bind': jsxNoBind,
  'react/jsx-no-literals': jsxNoLiterals,
  'react/no-adjacent-inline-elements': noAdjacentInlineElements,
  'react/no-arrow-function-lifecycle': noArrowFunctionLifecycle,
  'react/no-did-mount-set-state': noDidMountSetState,
  'react/no-did-update-set-state': noDidUpdateSetState,
  'react/no-invalid-html-attribute': noInvalidHtmlAttribute,
  'react/no-is-mounted': noIsMounted,
  'react/no-multi-comp': noMultiComp,
  'react/no-namespace': noNamespace,
  'react/no-object-type-as-default-prop': noObjectTypeAsDefaultProp,
  'react/no-redundant-should-component-update': noRedundantShouldComponentUpdate,
  'react/no-render-return-value': noRenderReturnValue,
  'react/no-typos': noTypos,
  'react/no-unescaped-entities': noUnescapedEntities,
  'react/prefer-es6-class': preferEs6Class,
  'react/prefer-stateless-function': preferStatelessFunction,
  'react/prop-types': propTypes,
  'react/react-in-jsx-scope': reactInJsxScope,
  'react/require-default-props': requireDefaultProps,
  'react/require-render-return': requireRenderReturn,
  'react/sort-comp': sortComp,
  'react/state-in-constructor': stateInConstructor,
  'react/static-property-placement': staticPropertyPlacement,
  'react/hooks-exhaustive-deps': hooksExhaustiveDeps,
  'deprecation/no-deprecated-api': noDeprecatedApi,
  'domain/enforce-naming': enforceNaming,
  'complexity/cognitive-complexity': cognitiveComplexity,
  'duplication/identical-functions': identicalFunctions,
  // Note: imports/* rules have been moved to eslint-plugin-dependencies package.
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object following the official plugin structure
 * 
 * This object is the main export of the plugin and contains:
 * - `meta`: Plugin metadata (name, version)
 * - `rules`: All available rules
 * 
 * Note: Security rules have been moved to eslint-plugin-secure-coding package.
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
    version: '1.9.1', // Should match package.json
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for common use cases
 * 
 * These configs provide ready-to-use rule configurations that follow best practices.
 * Users can extend these configs or use them as a starting point.
 * 
 * Note: Security rules have been moved to eslint-plugin-secure-coding package.
 * Use that package for security-focused configurations.
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
   * - Warns on high cognitive complexity (SonarQube-inspired)
   * - Warns on duplicate implementations (SonarQube-inspired)
   * 
   * Note: Security rules have been moved to eslint-plugin-secure-coding package.
   * Note: Accessibility rules have been moved to eslint-plugin-react-a11y package.
   * Note: Import/dependency rules have been moved to eslint-plugin-dependencies package.
   */
  recommended: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'warn',
      '@forge-js/llm-optimized/development/no-console-spaces': 'warn',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'warn',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'warn',
      '@forge-js/llm-optimized/architecture/consistent-existence-index-check': 'warn',
      '@forge-js/llm-optimized/architecture/prefer-event-target': 'warn',
      '@forge-js/llm-optimized/architecture/prefer-at': 'warn',
      '@forge-js/llm-optimized/architecture/no-unreadable-iife': 'warn',
      '@forge-js/llm-optimized/architecture/no-await-in-loop': 'warn',
      '@forge-js/llm-optimized/architecture/no-external-api-calls-in-utils': 'warn',
      '@forge-js/llm-optimized/ddd/ddd-anemic-domain-model': 'warn',
      '@forge-js/llm-optimized/ddd/ddd-value-object-immutability': 'warn',
      '@forge-js/llm-optimized/api/enforce-rest-conventions': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
  
  /**
   * Strict configuration for production-ready code
   * 
   * All rules are set to 'error' for maximum code quality enforcement
   * Includes SonarQube-inspired complexity and duplication rules
   * 
   * Note: Security rules have been moved to eslint-plugin-secure-coding package.
   * Note: Import/dependency rules have been moved to eslint-plugin-dependencies package.
   */
  strict: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'error',
      '@forge-js/llm-optimized/development/no-console-spaces': 'error',
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'error',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'error',
      '@forge-js/llm-optimized/duplication/identical-functions': 'error',
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'error',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'error',
      '@forge-js/llm-optimized/architecture/prefer-at': 'error',
      '@forge-js/llm-optimized/architecture/no-unreadable-iife': 'error',
      '@forge-js/llm-optimized/architecture/no-await-in-loop': 'error',
      '@forge-js/llm-optimized/architecture/no-external-api-calls-in-utils': 'error',
      '@forge-js/llm-optimized/ddd/ddd-anemic-domain-model': 'error',
      '@forge-js/llm-optimized/ddd/ddd-value-object-immutability': 'error',
      '@forge-js/llm-optimized/api/enforce-rest-conventions': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Architecture configuration
   * 
   * Enforces clean code patterns
   * Note: Module boundary rules have been moved to eslint-plugin-dependencies package.
   */
  architecture: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/architecture/no-external-api-calls-in-utils': 'error',
      '@forge-js/llm-optimized/architecture/prefer-at': 'error',
      '@forge-js/llm-optimized/architecture/no-unreadable-iife': 'error',
      '@forge-js/llm-optimized/architecture/no-await-in-loop': 'error',
      '@forge-js/llm-optimized/architecture/consistent-existence-index-check': 'error',
      '@forge-js/llm-optimized/architecture/prefer-event-target': 'error',
      '@forge-js/llm-optimized/architecture/consistent-function-scoping': 'error',
      '@forge-js/llm-optimized/architecture/filename-case': 'error',
      '@forge-js/llm-optimized/architecture/no-instanceof-array': 'error',
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
      '@forge-js/llm-optimized/react/required-attributes': 'warn',
      '@forge-js/llm-optimized/react/jsx-key': 'error',
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

  // Note: Accessibility configuration has been moved to eslint-plugin-react-a11y package.
  // Use that package for WCAG compliance: import reactA11y from 'eslint-plugin-react-a11y';

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
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'warn',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'warn',
      '@forge-js/llm-optimized/performance/no-unnecessary-rerenders': 'warn',
      '@forge-js/llm-optimized/performance/no-memory-leak-listeners': 'warn',
      '@forge-js/llm-optimized/performance/no-blocking-operations': 'warn',
      '@forge-js/llm-optimized/performance/no-unbounded-cache': 'warn',
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
      '@forge-js/llm-optimized/ddd/ddd-anemic-domain-model': 'warn',
      '@forge-js/llm-optimized/ddd/ddd-value-object-immutability': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * SonarQube-inspired configuration
   * 
   * Advanced code quality rules inspired by SonarQube:
   * - Cognitive complexity detection
   * - Duplicate function detection
   */
  sonarqube: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Modern React configuration (Hooks-focused)
   * 
   * Optimized for modern React codebases using functional components and hooks:
   * - Enables hooks-related performance rules (useMemo, useCallback patterns)
   * - Enables rules that apply to functional components
   * - Disables class component rules by default (they won't fire false positives)
   * - Focuses on common hooks mistakes (missing deps, stale closures)
   * 
   * @example
   * ```typescript
   * // eslint.config.js
   * import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
   * 
   * export default [
   *   llmOptimized.configs['react-modern'],
   * ];
   * ```
   */
  'react-modern': {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      // ======================================
      // ✅ HOOKS & FUNCTIONAL COMPONENT RULES
      // ======================================
      
      // Performance: Detect inline functions that cause re-renders
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'warn',
      
      // Performance: Detect missing memoization opportunities
      '@forge-js/llm-optimized/performance/react-render-optimization': 'warn',
      
      // Performance: Detect unnecessary re-renders (missing useMemo/useCallback)
      '@forge-js/llm-optimized/performance/no-unnecessary-rerenders': 'warn',
      
      // Performance: Detect memory leak listeners (cleanup in useEffect)
      '@forge-js/llm-optimized/performance/no-memory-leak-listeners': 'warn',
      
      // JSX: Key prop required in iterations (critical for hooks reconciliation)
      '@forge-js/llm-optimized/react/jsx-key': 'error',
      
      // Hooks: Exhaustive dependencies check (prevent stale closures)
      '@forge-js/llm-optimized/react/hooks-exhaustive-deps': 'warn',
      
      // JSX: No bind in JSX props (use useCallback instead)
      '@forge-js/llm-optimized/react/jsx-no-bind': 'warn',
      
      // Detect `this` usage in functional components (common mistake)
      '@forge-js/llm-optimized/react/no-this-in-sfc': 'error',
      
      // Catch typos in JSX properties
      '@forge-js/llm-optimized/react/no-unknown-property': 'error',
      
      // Prefer React.Children API over children prop
      '@forge-js/llm-optimized/react/no-children-prop': 'warn',
      
      // Prevent dangerous HTML injection (XSS via dangerouslySetInnerHTML)
      '@forge-js/llm-optimized/react/no-danger': 'warn',
      
      // Accessibility: Images must have alt text
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
      
      // Prevent invalid HTML attributes
      '@forge-js/llm-optimized/react/no-invalid-html-attribute': 'warn',
      
      // Required attributes validation
      '@forge-js/llm-optimized/react/required-attributes': 'warn',
      
      // Detect object literals as default props (stale closure trap)
      '@forge-js/llm-optimized/react/no-object-type-as-default-prop': 'warn',
      
      // ======================================
      // ❌ CLASS COMPONENT RULES (DISABLED)
      // These rules only apply to class components
      // and are disabled to avoid noise in modern codebases
      // ======================================
      
      // Class-specific: setState usage (use useState hook instead)
      '@forge-js/llm-optimized/react/no-set-state': 'off',
      
      // Class-specific: Direct state mutation (use useState)
      '@forge-js/llm-optimized/react/no-direct-mutation-state': 'off',
      
      // Class-specific: Accessing state in setState callback
      '@forge-js/llm-optimized/react/no-access-state-in-setstate': 'off',
      
      // Class-specific: setState in componentDidMount
      '@forge-js/llm-optimized/react/no-did-mount-set-state': 'off',
      
      // Class-specific: setState in componentDidUpdate
      '@forge-js/llm-optimized/react/no-did-update-set-state': 'off',
      
      // Class-specific: isMounted anti-pattern
      '@forge-js/llm-optimized/react/no-is-mounted': 'off',
      
      // Class-specific: Arrow function lifecycle methods
      '@forge-js/llm-optimized/react/no-arrow-function-lifecycle': 'off',
      
      // Class-specific: Redundant shouldComponentUpdate (use React.memo)
      '@forge-js/llm-optimized/react/no-redundant-should-component-update': 'off',
      
      // Class-specific: render() must return value
      '@forge-js/llm-optimized/react/require-render-return': 'off',
      
      // Class-specific: Component method ordering
      '@forge-js/llm-optimized/react/sort-comp': 'off',
      
      // Class-specific: State initialization in constructor
      '@forge-js/llm-optimized/react/state-in-constructor': 'off',
      
      // Class-specific: Static property placement
      '@forge-js/llm-optimized/react/static-property-placement': 'off',
      
      // Class-specific: ES6 class preference (N/A for functional)
      '@forge-js/llm-optimized/react/prefer-es6-class': 'off',
      
      // Legacy: defaultProps matching propTypes (use TypeScript instead)
      '@forge-js/llm-optimized/react/default-props-match-prop-types': 'off',
      
      // Legacy: defaultProps requirement (use TypeScript default params)
      '@forge-js/llm-optimized/react/require-default-props': 'off',
      
      // Legacy: PropTypes validation (use TypeScript instead)
      '@forge-js/llm-optimized/react/prop-types': 'off',
      
      // Class-specific: shouldComponentUpdate optimization (use React.memo)
      '@forge-js/llm-optimized/react/require-optimization': 'off',
      
      // Migration rule: Only enable when actively migrating from classes
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'off',
      
      // String refs are deprecated (always use useRef hook)
      '@forge-js/llm-optimized/react/no-string-refs': 'error',
      
      // Legacy: React import not needed in modern JSX Transform (React 17+)
      '@forge-js/llm-optimized/react/react-in-jsx-scope': 'off',
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

// Note: clearCircularDependencyCache has been moved to eslint-plugin-dependencies package.

/**
 * Re-export all rule Options types for convenience
 * 
 * Note: Security rule options have been moved to eslint-plugin-secure-coding package.
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
  // Architecture
  NoExternalApiCallsInUtilsOptions,
  ConsistentExistenceIndexCheckOptions,
  PreferEventTargetOptions,
  PreferAtOptions,
  NoUnreadableIifeOptions,
  NoAwaitInLoopOptions,
  // Complexity
  CognitiveComplexityOptions,
  // Deprecation
  NoDeprecatedApiOptions,
  // Development
  NoConsoleLogOptions,
  PreferDependencyVersionStrategyOptions,
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
  // Combined type
  AllRulesOptions,
} from './types/index';
