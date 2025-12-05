/**
 * eslint-plugin-secure-coding Type Exports
 * 
 * Barrel file that exports all security rule Options types with consistent naming.
 * 
 * Usage:
 * ```typescript
 * import type { NoSqlInjectionOptions } from 'eslint-plugin-secure-coding/types';
 * 
 * const config: NoSqlInjectionOptions = {
 *   allowDynamicTableNames: false,
 *   strategy: 'parameterize',
 * };
 * ```
 */

// Injection Rules
import type { Options as NoSqlInjectionOptions } from '../rules/security/no-sql-injection';
import type { Options as DatabaseInjectionOptions } from '../rules/security/database-injection';
import type { Options as DetectEvalWithExpressionOptions } from '../rules/security/detect-eval-with-expression';
import type { Options as DetectChildProcessOptions } from '../rules/security/detect-child-process';
import type { Options as NoUnsafeDynamicRequireOptions } from '../rules/security/no-unsafe-dynamic-require';
import type { Options as NoGraphqlInjectionOptions } from '../rules/security/no-graphql-injection';
import type { Options as NoXxeInjectionOptions } from '../rules/security/no-xxe-injection';
import type { Options as NoXpathInjectionOptions } from '../rules/security/no-xpath-injection';
import type { Options as NoLdapInjectionOptions } from '../rules/security/no-ldap-injection';
import type { Options as NoDirectiveInjectionOptions } from '../rules/security/no-directive-injection';
import type { Options as NoFormatStringInjectionOptions } from '../rules/security/no-format-string-injection';

// Path & File Rules
import type { Options as DetectNonLiteralFsFilenameOptions } from '../rules/security/detect-non-literal-fs-filename';
import type { Options as NoZipSlipOptions } from '../rules/security/no-zip-slip';
import type { Options as NoToctouVulnerabilityOptions } from '../rules/security/no-toctou-vulnerability';

// Regex Rules
import type { Options as DetectNonLiteralRegexpOptions } from '../rules/security/detect-non-literal-regexp';
import type { Options as NoRedosVulnerableRegexOptions } from '../rules/security/no-redos-vulnerable-regex';
import type { Options as NoUnsafeRegexConstructionOptions } from '../rules/security/no-unsafe-regex-construction';

// Object & Prototype Rules
import type { Options as DetectObjectInjectionOptions } from '../rules/security/detect-object-injection';
import type { Options as NoUnsafeDeserializationOptions } from '../rules/security/no-unsafe-deserialization';

// Credentials & Crypto Rules
import type { Options as NoHardcodedCredentialsOptions } from '../rules/security/no-hardcoded-credentials';
import type { Options as NoWeakCryptoOptions } from '../rules/security/no-weak-crypto';
import type { Options as NoInsufficientRandomOptions } from '../rules/security/no-insufficient-random';
import type { Options as NoTimingAttackOptions } from '../rules/security/no-timing-attack';
import type { Options as NoInsecureComparisonOptions } from '../rules/security/no-insecure-comparison';
import type { Options as NoInsecureJwtOptions } from '../rules/security/no-insecure-jwt';

// Input Validation & XSS Rules
import type { Options as NoUnvalidatedUserInputOptions } from '../rules/security/no-unvalidated-user-input';
import type { Options as NoUnsanitizedHtmlOptions } from '../rules/security/no-unsanitized-html';
import type { Options as NoUnescapedUrlParameterOptions } from '../rules/security/no-unescaped-url-parameter';
import type { Options as NoImproperSanitizationOptions } from '../rules/security/no-improper-sanitization';
import type { Options as NoImproperTypeValidationOptions } from '../rules/security/no-improper-type-validation';

// Authentication & Authorization Rules
import type { Options as NoMissingAuthenticationOptions } from '../rules/security/no-missing-authentication';
import type { Options as NoPrivilegeEscalationOptions } from '../rules/security/no-privilege-escalation';
import type { Options as NoWeakPasswordRecoveryOptions } from '../rules/security/no-weak-password-recovery';

// Session & Cookies Rules
import type { Options as NoInsecureCookieSettingsOptions } from '../rules/security/no-insecure-cookie-settings';
import type { Options as NoMissingCsrfProtectionOptions } from '../rules/security/no-missing-csrf-protection';
import type { Options as NoDocumentCookieOptions } from '../rules/security/no-document-cookie';

// Network & Headers Rules
import type { Options as NoMissingCorsCheckOptions } from '../rules/security/no-missing-cors-check';
import type { Options as NoMissingSecurityHeadersOptions } from '../rules/security/no-missing-security-headers';
import type { Options as NoInsecureRedirectsOptions } from '../rules/security/no-insecure-redirects';
import type { Options as NoUnencryptedTransmissionOptions } from '../rules/security/no-unencrypted-transmission';
import type { Options as NoClickjackingOptions } from '../rules/security/no-clickjacking';

// Data Exposure Rules
import type { Options as NoExposedSensitiveDataOptions } from '../rules/security/no-exposed-sensitive-data';
import type { Options as NoSensitiveDataExposureOptions } from '../rules/security/no-sensitive-data-exposure';

// Buffer & Memory Rules
import type { Options as NoBufferOverreadOptions } from '../rules/security/no-buffer-overread';

// Resource & DoS Rules
import type { Options as NoUnlimitedResourceAllocationOptions } from '../rules/security/no-unlimited-resource-allocation';
import type { Options as NoUncheckedLoopConditionOptions } from '../rules/security/no-unchecked-loop-condition';

// Platform Specific Rules
import type { Options as NoElectronSecurityIssuesOptions } from '../rules/security/no-electron-security-issues';
import type { Options as NoInsufficientPostmessageValidationOptions } from '../rules/security/no-insufficient-postmessage-validation';

// Export all types with consistent naming
export type {
  // Injection
  NoSqlInjectionOptions,
  DatabaseInjectionOptions,
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
  // Credentials & Crypto
  NoHardcodedCredentialsOptions,
  NoWeakCryptoOptions,
  NoInsufficientRandomOptions,
  NoTimingAttackOptions,
  NoInsecureComparisonOptions,
  NoInsecureJwtOptions,
  // Input Validation & XSS
  NoUnvalidatedUserInputOptions,
  NoUnsanitizedHtmlOptions,
  NoUnescapedUrlParameterOptions,
  NoImproperSanitizationOptions,
  NoImproperTypeValidationOptions,
  // Authentication & Authorization
  NoMissingAuthenticationOptions,
  NoPrivilegeEscalationOptions,
  NoWeakPasswordRecoveryOptions,
  // Session & Cookies
  NoInsecureCookieSettingsOptions,
  NoMissingCsrfProtectionOptions,
  NoDocumentCookieOptions,
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
  NoInsufficientPostmessageValidationOptions,
};

/**
 * Combined type for all security rule options
 * Useful for creating unified configuration objects
 * 
 * @example
 * ```typescript
 * const config: AllSecurityRulesOptions = {
 *   'no-sql-injection': {
 *     allowDynamicTableNames: false,
 *     strategy: 'parameterize',
 *   },
 *   'no-hardcoded-credentials': {
 *     ignorePatterns: ['test/*'],
 *   },
 * };
 * ```
 */
export type AllSecurityRulesOptions = {
  // Injection
  'no-sql-injection'?: NoSqlInjectionOptions;
  'database-injection'?: DatabaseInjectionOptions;
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
  // Credentials & Crypto
  'no-hardcoded-credentials'?: NoHardcodedCredentialsOptions;
  'no-weak-crypto'?: NoWeakCryptoOptions;
  'no-insufficient-random'?: NoInsufficientRandomOptions;
  'no-timing-attack'?: NoTimingAttackOptions;
  'no-insecure-comparison'?: NoInsecureComparisonOptions;
  'no-insecure-jwt'?: NoInsecureJwtOptions;
  // Input Validation & XSS
  'no-unvalidated-user-input'?: NoUnvalidatedUserInputOptions;
  'no-unsanitized-html'?: NoUnsanitizedHtmlOptions;
  'no-unescaped-url-parameter'?: NoUnescapedUrlParameterOptions;
  'no-improper-sanitization'?: NoImproperSanitizationOptions;
  'no-improper-type-validation'?: NoImproperTypeValidationOptions;
  // Authentication & Authorization
  'no-missing-authentication'?: NoMissingAuthenticationOptions;
  'no-privilege-escalation'?: NoPrivilegeEscalationOptions;
  'no-weak-password-recovery'?: NoWeakPasswordRecoveryOptions;
  // Session & Cookies
  'no-insecure-cookie-settings'?: NoInsecureCookieSettingsOptions;
  'no-missing-csrf-protection'?: NoMissingCsrfProtectionOptions;
  'no-document-cookie'?: NoDocumentCookieOptions;
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
  'no-insufficient-postmessage-validation'?: NoInsufficientPostmessageValidationOptions;
};

