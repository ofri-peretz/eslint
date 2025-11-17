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

import type { TSESLint } from '@forge-js/eslint-plugin-utils';

// Development rules
import { noConsoleLog } from './rules/development/no-console-log';
import { preferDependencyVersionStrategy } from './rules/development/prefer-dependency-version-strategy';

// Architecture rules
import { noCircularDependencies } from './rules/architecture/no-circular-dependencies';
import { noInternalModules } from './rules/architecture/no-internal-modules';
import { noCrossDomainImports } from './rules/architecture/no-cross-domain-imports';
import { enforceDependencyDirection } from './rules/architecture/enforce-dependency-direction';

// Security rules
import { noSqlInjection } from './rules/security/no-sql-injection';
import { noUnsafeDynamicRequire } from './rules/security/no-unsafe-dynamic-require';
import { databaseInjection } from './rules/security/database-injection';
import { detectEvalWithExpression } from './rules/security/detect-eval-with-expression';
import { detectChildProcess } from './rules/security/detect-child-process';
import { detectNonLiteralFsFilename } from './rules/security/detect-non-literal-fs-filename';
import { detectNonLiteralRegexp } from './rules/security/detect-non-literal-regexp';
import { detectObjectInjection } from './rules/security/detect-object-injection';
import { noHardcodedCredentials } from './rules/security/no-hardcoded-credentials';
import { noWeakCrypto } from './rules/security/no-weak-crypto';
import { noInsufficientRandom } from './rules/security/no-insufficient-random';
import { noUnvalidatedUserInput } from './rules/security/no-unvalidated-user-input';
import { noUnsanitizedHtml } from './rules/security/no-unsanitized-html';
import { noUnescapedUrlParameter } from './rules/security/no-unescaped-url-parameter';
import { noMissingCorsCheck } from './rules/security/no-missing-cors-check';
import { noInsecureComparison } from './rules/security/no-insecure-comparison';
import { noMissingAuthentication } from './rules/security/no-missing-authentication';
import { noPrivilegeEscalation } from './rules/security/no-privilege-escalation';
import { noInsecureCookieSettings } from './rules/security/no-insecure-cookie-settings';
import { noMissingCsrfProtection } from './rules/security/no-missing-csrf-protection';
import { noExposedSensitiveData } from './rules/security/no-exposed-sensitive-data';
import { noUnencryptedTransmission } from './rules/security/no-unencrypted-transmission';
import { noRedosVulnerableRegex } from './rules/security/no-redos-vulnerable-regex';
import { noUnsafeRegexConstruction } from './rules/security/no-unsafe-regex-construction';
import { noSensitiveDataExposure } from './rules/security/no-sensitive-data-exposure';

// Quality rules
import { noCommentedCode } from './rules/quality/no-commented-code';
import { maxParameters } from './rules/quality/max-parameters';
import { noMissingNullChecks } from './rules/quality/no-missing-null-checks';
import { noUnsafeTypeNarrowing } from './rules/quality/no-unsafe-type-narrowing';

// Error handling rules
import { noUnhandledPromise } from './rules/error-handling/no-unhandled-promise';
import { noSilentErrors } from './rules/error-handling/no-silent-errors';
import { noMissingErrorContext } from './rules/error-handling/no-missing-error-context';

// Performance rules
import { noUnnecessaryRerenders } from './rules/performance/no-unnecessary-rerenders';
import { noMemoryLeakListeners } from './rules/performance/no-memory-leak-listeners';
import { noBlockingOperations } from './rules/performance/no-blocking-operations';
import { noUnboundedCache } from './rules/performance/no-unbounded-cache';
import { detectNPlusOneQueries } from './rules/performance/detect-n-plus-one-queries';
import { reactRenderOptimization } from './rules/performance/react-render-optimization';

// Accessibility rules
import { noKeyboardInaccessibleElements } from './rules/accessibility/no-keyboard-inaccessible-elements';
import { noMissingAriaLabels } from './rules/accessibility/no-missing-aria-labels';

// TypeScript rules
// Note: TypeScript-specific rules that duplicate TSC functionality have been removed.
// Use @typescript-eslint/eslint-plugin for proper TypeScript linting with type information.

// Additional security rules
import { noToctouVulnerability } from './rules/security/no-toctou-vulnerability';
import { noMissingSecurityHeaders } from './rules/security/no-missing-security-headers';
import { noInsecureRedirects } from './rules/security/no-insecure-redirects';

// Architecture rules
import { noExternalApiCallsInUtils } from './rules/architecture/no-external-api-calls-in-utils';

// Migration rules
import { reactClassToHooks } from './rules/migration/react-class-to-hooks';

// Performance rules
import { reactNoInlineFunctions } from './rules/performance/react-no-inline-functions';

// Accessibility rules
import { imgRequiresAlt } from './rules/accessibility/img-requires-alt';

// API rules
import { enforceRestConventions } from './rules/api/enforce-rest-conventions';

// React rules
import { requiredAttributes } from './rules/react/required-attributes';

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

/**
 * Collection of all ESLint rules provided by this plugin
 * 
 * Each rule must be created using the `createRule` utility from @forge-js/eslint-plugin-utils
 * which ensures proper typing and documentation generation.
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
  'no-console-log': noConsoleLog,
  'prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'no-circular-dependencies': noCircularDependencies,
  'no-internal-modules': noInternalModules,
  'no-sql-injection': noSqlInjection,
  'no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'database-injection': databaseInjection,
  'detect-eval-with-expression': detectEvalWithExpression,
  'detect-child-process': detectChildProcess,
  'detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'detect-object-injection': detectObjectInjection,
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-weak-crypto': noWeakCrypto,
  'no-insufficient-random': noInsufficientRandom,
  'no-unvalidated-user-input': noUnvalidatedUserInput,
  'no-unsanitized-html': noUnsanitizedHtml,
  'no-unescaped-url-parameter': noUnescapedUrlParameter,
  'no-missing-cors-check': noMissingCorsCheck,
  'no-insecure-comparison': noInsecureComparison,
  'no-missing-authentication': noMissingAuthentication,
  'no-privilege-escalation': noPrivilegeEscalation,
  'no-insecure-cookie-settings': noInsecureCookieSettings,
  'no-missing-csrf-protection': noMissingCsrfProtection,
  'no-exposed-sensitive-data': noExposedSensitiveData,
  'no-unencrypted-transmission': noUnencryptedTransmission,
  'no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'no-unsafe-regex-construction': noUnsafeRegexConstruction,
  'no-commented-code': noCommentedCode,
  'max-parameters': maxParameters,
  'no-unhandled-promise': noUnhandledPromise,
  'no-silent-errors': noSilentErrors,
  'no-missing-error-context': noMissingErrorContext,
  'no-missing-null-checks': noMissingNullChecks,
  'no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'no-unnecessary-rerenders': noUnnecessaryRerenders,
  'no-memory-leak-listeners': noMemoryLeakListeners,
  'no-blocking-operations': noBlockingOperations,
  'no-unbounded-cache': noUnboundedCache,
  'detect-n-plus-one-queries': detectNPlusOneQueries,
  'react-render-optimization': reactRenderOptimization,
  'no-keyboard-inaccessible-elements': noKeyboardInaccessibleElements,
  'no-missing-aria-labels': noMissingAriaLabels,
  'no-toctou-vulnerability': noToctouVulnerability,
  'no-missing-security-headers': noMissingSecurityHeaders,
  'no-insecure-redirects': noInsecureRedirects,
  'no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'no-cross-domain-imports': noCrossDomainImports,
  'enforce-dependency-direction': enforceDependencyDirection,
  'nested-complexity-hotspots': nestedComplexityHotspots,
  'no-sensitive-data-exposure': noSensitiveDataExposure,
  'ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd-value-object-immutability': dddValueObjectImmutability,
  'enforce-rest-conventions': enforceRestConventions,
  'react-class-to-hooks': reactClassToHooks,
  'react-no-inline-functions': reactNoInlineFunctions,
  'img-requires-alt': imgRequiresAlt,
  'required-attributes': requiredAttributes,
  'no-deprecated-api': noDeprecatedApi,
  'enforce-naming': enforceNaming,
  'cognitive-complexity': cognitiveComplexity,
  'identical-functions': identicalFunctions,
  
  // Categorized rule names (for better organization)
  'development/no-console-log': noConsoleLog,
  'development/prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'architecture/no-circular-dependencies': noCircularDependencies,
  'architecture/no-internal-modules': noInternalModules,
  'security/no-sql-injection': noSqlInjection,
  'security/no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'security/database-injection': databaseInjection,
  'security/detect-eval-with-expression': detectEvalWithExpression,
  'security/detect-child-process': detectChildProcess,
  'security/detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'security/detect-non-literal-regexp': detectNonLiteralRegexp,
  'security/detect-object-injection': detectObjectInjection,
  'security/no-hardcoded-credentials': noHardcodedCredentials,
  'security/no-weak-crypto': noWeakCrypto,
  'security/no-insufficient-random': noInsufficientRandom,
  'security/no-unvalidated-user-input': noUnvalidatedUserInput,
  'security/no-unsanitized-html': noUnsanitizedHtml,
  'security/no-unescaped-url-parameter': noUnescapedUrlParameter,
  'security/no-missing-cors-check': noMissingCorsCheck,
  'security/no-insecure-comparison': noInsecureComparison,
  'security/no-missing-authentication': noMissingAuthentication,
  'security/no-privilege-escalation': noPrivilegeEscalation,
  'security/no-insecure-cookie-settings': noInsecureCookieSettings,
  'security/no-missing-csrf-protection': noMissingCsrfProtection,
  'security/no-exposed-sensitive-data': noExposedSensitiveData,
  'security/no-unencrypted-transmission': noUnencryptedTransmission,
  'security/no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'security/no-unsafe-regex-construction': noUnsafeRegexConstruction,
  'quality/no-commented-code': noCommentedCode,
  'quality/max-parameters': maxParameters,
  'quality/no-missing-null-checks': noMissingNullChecks,
  'quality/no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'error-handling/no-unhandled-promise': noUnhandledPromise,
  'error-handling/no-silent-errors': noSilentErrors,
  'error-handling/no-missing-error-context': noMissingErrorContext,
  'performance/no-unnecessary-rerenders': noUnnecessaryRerenders,
  'performance/no-memory-leak-listeners': noMemoryLeakListeners,
  'performance/no-blocking-operations': noBlockingOperations,
  'performance/no-unbounded-cache': noUnboundedCache,
  'performance/detect-n-plus-one-queries': detectNPlusOneQueries,
  'performance/react-render-optimization': reactRenderOptimization,
  'accessibility/no-keyboard-inaccessible-elements': noKeyboardInaccessibleElements,
  'accessibility/no-missing-aria-labels': noMissingAriaLabels,
  'security/no-toctou-vulnerability': noToctouVulnerability,
  'security/no-missing-security-headers': noMissingSecurityHeaders,
  'security/no-insecure-redirects': noInsecureRedirects,
  'architecture/no-external-api-calls-in-utils': noExternalApiCallsInUtils,
  'architecture/no-cross-domain-imports': noCrossDomainImports,
  'architecture/enforce-dependency-direction': enforceDependencyDirection,
  'complexity/nested-complexity-hotspots': nestedComplexityHotspots,
  'security/no-sensitive-data-exposure': noSensitiveDataExposure,
  'ddd/ddd-anemic-domain-model': dddAnemicDomainModel,
  'ddd/ddd-value-object-immutability': dddValueObjectImmutability,
  'api/enforce-rest-conventions': enforceRestConventions,
  'migration/react-class-to-hooks': reactClassToHooks,
  'performance/react-no-inline-functions': reactNoInlineFunctions,
  'accessibility/img-requires-alt': imgRequiresAlt,
  'react/required-attributes': requiredAttributes,
  'deprecation/no-deprecated-api': noDeprecatedApi,
  'domain/enforce-naming': enforceNaming,
  'complexity/cognitive-complexity': cognitiveComplexity,
  'duplication/identical-functions': identicalFunctions,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object following the official plugin structure
 * 
 * This object is the main export of the plugin and contains:
 * - `meta`: Plugin metadata (name, version)
 * - `rules`: All available rules
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
    version: '0.0.3-rc.16',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for common use cases
 * 
 * These configs provide ready-to-use rule configurations that follow best practices.
 * Users can extend these configs or use them as a starting point.
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
   * - Errors on circular dependencies
   * - Errors on deep module imports
   * - Errors on critical security issues
   * - Warns on accessibility violations
   * - Warns on high cognitive complexity (SonarQube-inspired)
   * - Warns on duplicate implementations (SonarQube-inspired)
   */
  recommended: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'warn',
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
      '@forge-js/llm-optimized/security/no-hardcoded-credentials': 'warn',
      '@forge-js/llm-optimized/security/no-weak-crypto': 'warn',
      '@forge-js/llm-optimized/security/no-insufficient-random': 'warn',
      '@forge-js/llm-optimized/security/no-unvalidated-user-input': 'warn',
      '@forge-js/llm-optimized/security/no-unsanitized-html': 'error',
      '@forge-js/llm-optimized/security/no-unescaped-url-parameter': 'warn',
      '@forge-js/llm-optimized/security/no-missing-cors-check': 'warn',
      '@forge-js/llm-optimized/security/no-insecure-comparison': 'warn',
      '@forge-js/llm-optimized/security/no-missing-authentication': 'warn',
      '@forge-js/llm-optimized/security/no-privilege-escalation': 'warn',
      '@forge-js/llm-optimized/security/no-insecure-cookie-settings': 'warn',
      '@forge-js/llm-optimized/security/no-missing-csrf-protection': 'warn',
      '@forge-js/llm-optimized/security/no-exposed-sensitive-data': 'error',
      '@forge-js/llm-optimized/security/no-unencrypted-transmission': 'warn',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'warn',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'warn',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'warn',
      '@forge-js/llm-optimized/architecture/no-cross-domain-imports': 'warn',
      '@forge-js/llm-optimized/architecture/enforce-dependency-direction': 'warn',
      '@forge-js/llm-optimized/security/no-sensitive-data-exposure': 'warn',
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
   */
  strict: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/development/no-console-log': 'error',
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
      '@forge-js/llm-optimized/security/no-hardcoded-credentials': 'error',
      '@forge-js/llm-optimized/security/no-weak-crypto': 'error',
      '@forge-js/llm-optimized/security/no-insufficient-random': 'error',
      '@forge-js/llm-optimized/security/no-unvalidated-user-input': 'error',
      '@forge-js/llm-optimized/security/no-unsanitized-html': 'error',
      '@forge-js/llm-optimized/security/no-unescaped-url-parameter': 'error',
      '@forge-js/llm-optimized/security/no-missing-cors-check': 'error',
      '@forge-js/llm-optimized/security/no-insecure-comparison': 'error',
      '@forge-js/llm-optimized/security/no-missing-authentication': 'error',
      '@forge-js/llm-optimized/security/no-privilege-escalation': 'error',
      '@forge-js/llm-optimized/security/no-insecure-cookie-settings': 'error',
      '@forge-js/llm-optimized/security/no-missing-csrf-protection': 'error',
      '@forge-js/llm-optimized/security/no-exposed-sensitive-data': 'error',
      '@forge-js/llm-optimized/security/no-unencrypted-transmission': 'error',
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
      '@forge-js/llm-optimized/performance/react-no-inline-functions': 'error',
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'error',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'error',
      '@forge-js/llm-optimized/duplication/identical-functions': 'error',
      '@forge-js/llm-optimized/performance/detect-n-plus-one-queries': 'error',
      '@forge-js/llm-optimized/performance/react-render-optimization': 'error',
      '@forge-js/llm-optimized/architecture/no-cross-domain-imports': 'error',
      '@forge-js/llm-optimized/architecture/enforce-dependency-direction': 'error',
      '@forge-js/llm-optimized/security/no-sensitive-data-exposure': 'error',
      '@forge-js/llm-optimized/ddd/ddd-anemic-domain-model': 'error',
      '@forge-js/llm-optimized/ddd/ddd-value-object-immutability': 'error',
      '@forge-js/llm-optimized/api/enforce-rest-conventions': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Security-focused configuration
   * 
   * Enables all security rules for maximum protection
   * Includes comprehensive security vulnerability detection
   */
  security: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/security/no-sql-injection': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-dynamic-require': 'error',
      '@forge-js/llm-optimized/security/database-injection': 'error',
      '@forge-js/llm-optimized/security/detect-eval-with-expression': 'error',
      '@forge-js/llm-optimized/security/detect-child-process': 'error',
      '@forge-js/llm-optimized/security/detect-non-literal-fs-filename': 'error',
      '@forge-js/llm-optimized/security/detect-non-literal-regexp': 'error',
      '@forge-js/llm-optimized/security/detect-object-injection': 'error',
      '@forge-js/llm-optimized/security/no-hardcoded-credentials': 'error',
      '@forge-js/llm-optimized/security/no-weak-crypto': 'error',
      '@forge-js/llm-optimized/security/no-insufficient-random': 'error',
      '@forge-js/llm-optimized/security/no-unvalidated-user-input': 'error',
      '@forge-js/llm-optimized/security/no-unsanitized-html': 'error',
      '@forge-js/llm-optimized/security/no-unescaped-url-parameter': 'error',
      '@forge-js/llm-optimized/security/no-missing-cors-check': 'error',
      '@forge-js/llm-optimized/security/no-insecure-comparison': 'error',
      '@forge-js/llm-optimized/security/no-missing-authentication': 'error',
      '@forge-js/llm-optimized/security/no-privilege-escalation': 'error',
      '@forge-js/llm-optimized/security/no-insecure-cookie-settings': 'error',
      '@forge-js/llm-optimized/security/no-missing-csrf-protection': 'error',
      '@forge-js/llm-optimized/security/no-exposed-sensitive-data': 'error',
      '@forge-js/llm-optimized/security/no-unencrypted-transmission': 'error',
      '@forge-js/llm-optimized/security/no-redos-vulnerable-regex': 'error',
      '@forge-js/llm-optimized/security/no-unsafe-regex-construction': 'error',
      '@forge-js/llm-optimized/security/no-sensitive-data-exposure': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Architecture configuration
   * 
   * Enforces clean architecture and module boundaries
   */
  architecture: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/architecture/no-circular-dependencies': 'error',
      '@forge-js/llm-optimized/architecture/no-internal-modules': 'error',
      '@forge-js/llm-optimized/architecture/no-cross-domain-imports': 'error',
      '@forge-js/llm-optimized/architecture/enforce-dependency-direction': 'error',
      '@forge-js/llm-optimized/architecture/no-external-api-calls-in-utils': 'error',
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
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
      '@forge-js/llm-optimized/react/required-attributes': 'warn',
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

  /**
   * Accessibility configuration
   * 
   * Enforces WCAG compliance
   */
  accessibility: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

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
   * - Comprehensive injection prevention
   */
  sonarqube: {
    plugins: {
      '@forge-js/llm-optimized': plugin,
    },
    rules: {
      '@forge-js/llm-optimized/complexity/cognitive-complexity': 'warn',
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': 'warn',
      '@forge-js/llm-optimized/duplication/identical-functions': 'warn',
      '@forge-js/llm-optimized/security/database-injection': 'error',
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

/**
 * Re-export all rule Options types for convenience
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
  // Accessibility
  ImgRequiresAltOptions,
  // Architecture
  NoCircularDependenciesOptions,
  NoInternalModulesOptions,
  // Complexity
  CognitiveComplexityOptions,
  // Deprecation
  NoDeprecatedApiOptions,
  // Development
  NoConsoleLogOptions,
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
  PreferDependencyVersionStrategyOptions,
  NoRedosVulnerableRegexOptions,
  NoUnsafeRegexConstructionOptions,
  // Combined type
  AllRulesOptions,
} from './types/index';
