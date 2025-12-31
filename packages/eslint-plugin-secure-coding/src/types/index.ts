/**
 * eslint-plugin-secure-coding Type Exports
 * 
 * Barrel file that exports all security rule Options types with consistent naming.
 * 
 * Usage:
 * ```typescript
 * import type { NoHardcodedCredentialsOptions } from 'eslint-plugin-secure-coding/types';
 * 
 * const config: NoHardcodedCredentialsOptions = {
 *   ignorePatterns: ['test/*'],
 * };
 * ```
 */

// Injection Rules
import type { Options as DetectEvalWithExpressionOptions } from '../rules/detect-eval-with-expression';
import type { Options as DetectChildProcessOptions } from '../rules/detect-child-process';
import type { Options as NoUnsafeDynamicRequireOptions } from '../rules/no-unsafe-dynamic-require';
import type { Options as NoGraphqlInjectionOptions } from '../rules/no-graphql-injection';
import type { Options as NoXxeInjectionOptions } from '../rules/no-xxe-injection';
import type { Options as NoXpathInjectionOptions } from '../rules/no-xpath-injection';
import type { Options as NoLdapInjectionOptions } from '../rules/no-ldap-injection';
import type { Options as NoDirectiveInjectionOptions } from '../rules/no-directive-injection';
import type { Options as NoFormatStringInjectionOptions } from '../rules/no-format-string-injection';

// Path & File Rules
import type { Options as DetectNonLiteralFsFilenameOptions } from '../rules/detect-non-literal-fs-filename';
import type { Options as NoZipSlipOptions } from '../rules/no-zip-slip';
import type { Options as NoToctouVulnerabilityOptions } from '../rules/no-toctou-vulnerability';

// Regex Rules
import type { Options as DetectNonLiteralRegexpOptions } from '../rules/detect-non-literal-regexp';
import type { Options as NoRedosVulnerableRegexOptions } from '../rules/no-redos-vulnerable-regex';
import type { Options as NoUnsafeRegexConstructionOptions } from '../rules/no-unsafe-regex-construction';

// Object & Prototype Rules
import type { Options as DetectObjectInjectionOptions } from '../rules/detect-object-injection';
import type { Options as NoUnsafeDeserializationOptions } from '../rules/no-unsafe-deserialization';

// Credentials Rules (crypto/timing/jwt moved to dedicated plugins)
import type { Options as NoHardcodedCredentialsOptions } from '../rules/no-hardcoded-credentials';
import type { Options as NoInsecureComparisonOptions } from '../rules/no-insecure-comparison';

// Input Validation & XSS Rules (unsanitized-html moved to browser-security)
import type { Options as NoUnvalidatedUserInputOptions } from '../rules/no-unvalidated-user-input';
import type { Options as NoUnescapedUrlParameterOptions } from '../rules/no-unescaped-url-parameter';
import type { Options as NoImproperSanitizationOptions } from '../rules/no-improper-sanitization';
import type { Options as NoImproperTypeValidationOptions } from '../rules/no-improper-type-validation';

// Authentication & Authorization Rules
import type { Options as NoMissingAuthenticationOptions } from '../rules/no-missing-authentication';
import type { Options as NoPrivilegeEscalationOptions } from '../rules/no-privilege-escalation';
import type { Options as NoWeakPasswordRecoveryOptions } from '../rules/no-weak-password-recovery';

// Session & Cookies Rules (cookie rules moved to browser-security)
import type { Options as NoMissingCsrfProtectionOptions } from '../rules/no-missing-csrf-protection';

// Network & Headers Rules
import type { Options as NoMissingCorsCheckOptions } from '../rules/no-missing-cors-check';
import type { Options as NoMissingSecurityHeadersOptions } from '../rules/no-missing-security-headers';
import type { Options as NoInsecureRedirectsOptions } from '../rules/no-insecure-redirects';
import type { Options as NoUnencryptedTransmissionOptions } from '../rules/no-unencrypted-transmission';
import type { Options as NoClickjackingOptions } from '../rules/no-clickjacking';

// Data Exposure Rules
import type { Options as NoExposedSensitiveDataOptions } from '../rules/no-exposed-sensitive-data';
import type { Options as NoSensitiveDataExposureOptions } from '../rules/no-sensitive-data-exposure';

// Buffer & Memory Rules
import type { Options as NoBufferOverreadOptions } from '../rules/no-buffer-overread';

// Resource & DoS Rules
import type { Options as NoUnlimitedResourceAllocationOptions } from '../rules/no-unlimited-resource-allocation';
import type { Options as NoUncheckedLoopConditionOptions } from '../rules/no-unchecked-loop-condition';

// Platform Specific Rules
import type { Options as NoElectronSecurityIssuesOptions } from '../rules/no-electron-security-issues';

// Export all types with consistent naming
export type {
  // Injection
  DetectEvalWithExpressionOptions,
  DetectChildProcessOptions,
  NoUnsafeDynamicRequireOptions,
  NoGraphqlInjectionOptions,
  NoXxeInjectionOptions,
  NoXpathInjectionOptions,
  NoLdapInjectionOptions,
  NoDirectiveInjectionOptions,
  NoFormatStringInjectionOptions,
  // Path & File
  DetectNonLiteralFsFilenameOptions,
  NoZipSlipOptions,
  NoToctouVulnerabilityOptions,
  // Regex
  DetectNonLiteralRegexpOptions,
  NoRedosVulnerableRegexOptions,
  NoUnsafeRegexConstructionOptions,
  // Object & Prototype
  DetectObjectInjectionOptions,
  NoUnsafeDeserializationOptions,
  // Credentials
  NoHardcodedCredentialsOptions,
  NoInsecureComparisonOptions,
  // Input Validation & XSS
  NoUnvalidatedUserInputOptions,
  NoUnescapedUrlParameterOptions,
  NoImproperSanitizationOptions,
  NoImproperTypeValidationOptions,
  // Authentication & Authorization
  NoMissingAuthenticationOptions,
  NoPrivilegeEscalationOptions,
  NoWeakPasswordRecoveryOptions,
  // Session & Cookies
  NoMissingCsrfProtectionOptions,
  // Network & Headers
  NoMissingCorsCheckOptions,
  NoMissingSecurityHeadersOptions,
  NoInsecureRedirectsOptions,
  NoUnencryptedTransmissionOptions,
  NoClickjackingOptions,
  // Data Exposure
  NoExposedSensitiveDataOptions,
  NoSensitiveDataExposureOptions,
  // Buffer & Memory
  NoBufferOverreadOptions,
  // Resource & DoS
  NoUnlimitedResourceAllocationOptions,
  NoUncheckedLoopConditionOptions,
  // Platform Specific
  NoElectronSecurityIssuesOptions,
};

/**
 * Combined type for all security rule options
 * Useful for creating unified configuration objects
 * 
 * @example
 * ```typescript
 * const config: AllSecurityRulesOptions = {
 *   'no-hardcoded-credentials': {
 *     ignorePatterns: ['test/*'],
 *   },
 * };
 * ```
 */
export type AllSecurityRulesOptions = {
  // Injection
  'detect-eval-with-expression'?: DetectEvalWithExpressionOptions;
  'detect-child-process'?: DetectChildProcessOptions;
  'no-unsafe-dynamic-require'?: NoUnsafeDynamicRequireOptions;
  'no-graphql-injection'?: NoGraphqlInjectionOptions;
  'no-xxe-injection'?: NoXxeInjectionOptions;
  'no-xpath-injection'?: NoXpathInjectionOptions;
  'no-ldap-injection'?: NoLdapInjectionOptions;
  'no-directive-injection'?: NoDirectiveInjectionOptions;
  'no-format-string-injection'?: NoFormatStringInjectionOptions;
  // Path & File
  'detect-non-literal-fs-filename'?: DetectNonLiteralFsFilenameOptions;
  'no-zip-slip'?: NoZipSlipOptions;
  'no-toctou-vulnerability'?: NoToctouVulnerabilityOptions;
  // Regex
  'detect-non-literal-regexp'?: DetectNonLiteralRegexpOptions;
  'no-redos-vulnerable-regex'?: NoRedosVulnerableRegexOptions;
  'no-unsafe-regex-construction'?: NoUnsafeRegexConstructionOptions;
  // Object & Prototype
  'detect-object-injection'?: DetectObjectInjectionOptions;
  'no-unsafe-deserialization'?: NoUnsafeDeserializationOptions;
  // Credentials
  'no-hardcoded-credentials'?: NoHardcodedCredentialsOptions;
  'no-insecure-comparison'?: NoInsecureComparisonOptions;
  // Input Validation & XSS
  'no-unvalidated-user-input'?: NoUnvalidatedUserInputOptions;
  'no-unescaped-url-parameter'?: NoUnescapedUrlParameterOptions;
  'no-improper-sanitization'?: NoImproperSanitizationOptions;
  'no-improper-type-validation'?: NoImproperTypeValidationOptions;
  // Authentication & Authorization
  'no-missing-authentication'?: NoMissingAuthenticationOptions;
  'no-privilege-escalation'?: NoPrivilegeEscalationOptions;
  'no-weak-password-recovery'?: NoWeakPasswordRecoveryOptions;
  // Session & Cookies
  'no-missing-csrf-protection'?: NoMissingCsrfProtectionOptions;
  // Network & Headers
  'no-missing-cors-check'?: NoMissingCorsCheckOptions;
  'no-missing-security-headers'?: NoMissingSecurityHeadersOptions;
  'no-insecure-redirects'?: NoInsecureRedirectsOptions;
  'no-unencrypted-transmission'?: NoUnencryptedTransmissionOptions;
  'no-clickjacking'?: NoClickjackingOptions;
  // Data Exposure
  'no-exposed-sensitive-data'?: NoExposedSensitiveDataOptions;
  'no-sensitive-data-exposure'?: NoSensitiveDataExposureOptions;
  // Buffer & Memory
  'no-buffer-overread'?: NoBufferOverreadOptions;
  // Resource & DoS
  'no-unlimited-resource-allocation'?: NoUnlimitedResourceAllocationOptions;
  'no-unchecked-loop-condition'?: NoUncheckedLoopConditionOptions;
  // Platform Specific
  'no-electron-security-issues'?: NoElectronSecurityIssuesOptions;
};
