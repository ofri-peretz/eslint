/**
 * eslint-plugin-secure-coding
 * 
 * A comprehensive security-focused ESLint plugin with 48+ rules
 * for detecting and preventing security vulnerabilities in JavaScript/TypeScript code.
 * 
 * Features:
 * - LLM-optimized error messages with CWE references
 * - OWASP Top 10 coverage
 * - Auto-fix capabilities where safe
 * - Structured context for AI assistants
 * 
 * @see https://github.com/ofri-peretz/forge-js#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Security rules - Injection
import { noSqlInjection } from './rules/security/no-sql-injection';
import { databaseInjection } from './rules/security/database-injection';
import { detectEvalWithExpression } from './rules/security/detect-eval-with-expression';
import { detectChildProcess } from './rules/security/detect-child-process';
import { noUnsafeDynamicRequire } from './rules/security/no-unsafe-dynamic-require';
import { noGraphqlInjection } from './rules/security/no-graphql-injection';
import { noXxeInjection } from './rules/security/no-xxe-injection';
import { noXpathInjection } from './rules/security/no-xpath-injection';
import { noLdapInjection } from './rules/security/no-ldap-injection';
import { noDirectiveInjection } from './rules/security/no-directive-injection';
import { noFormatStringInjection } from './rules/security/no-format-string-injection';

// Security rules - Path & File
import { detectNonLiteralFsFilename } from './rules/security/detect-non-literal-fs-filename';
import { noZipSlip } from './rules/security/no-zip-slip';
import { noToctouVulnerability } from './rules/security/no-toctou-vulnerability';

// Security rules - Regex
import { detectNonLiteralRegexp } from './rules/security/detect-non-literal-regexp';
import { noRedosVulnerableRegex } from './rules/security/no-redos-vulnerable-regex';
import { noUnsafeRegexConstruction } from './rules/security/no-unsafe-regex-construction';

// Security rules - Object & Prototype
import { detectObjectInjection } from './rules/security/detect-object-injection';
import { noUnsafeDeserialization } from './rules/security/no-unsafe-deserialization';

// Security rules - Credentials & Crypto
import { noHardcodedCredentials } from './rules/security/no-hardcoded-credentials';
import { noWeakCrypto } from './rules/security/no-weak-crypto';
import { noInsufficientRandom } from './rules/security/no-insufficient-random';
import { noTimingAttack } from './rules/security/no-timing-attack';
import { noInsecureComparison } from './rules/security/no-insecure-comparison';
import { noInsecureJwt } from './rules/security/no-insecure-jwt';

// Security rules - Input Validation & XSS
import { noUnvalidatedUserInput } from './rules/security/no-unvalidated-user-input';
import { noUnsanitizedHtml } from './rules/security/no-unsanitized-html';
import { noUnescapedUrlParameter } from './rules/security/no-unescaped-url-parameter';
import { noImproperSanitization } from './rules/security/no-improper-sanitization';
import { noImproperTypeValidation } from './rules/security/no-improper-type-validation';

// Security rules - Authentication & Authorization
import { noMissingAuthentication } from './rules/security/no-missing-authentication';
import { noPrivilegeEscalation } from './rules/security/no-privilege-escalation';
import { noWeakPasswordRecovery } from './rules/security/no-weak-password-recovery';

// Security rules - Session & Cookies
import { noInsecureCookieSettings } from './rules/security/no-insecure-cookie-settings';
import { noMissingCsrfProtection } from './rules/security/no-missing-csrf-protection';
import { noDocumentCookie } from './rules/security/no-document-cookie';

// Security rules - Network & Headers
import { noMissingCorsCheck } from './rules/security/no-missing-cors-check';
import { noMissingSecurityHeaders } from './rules/security/no-missing-security-headers';
import { noInsecureRedirects } from './rules/security/no-insecure-redirects';
import { noUnencryptedTransmission } from './rules/security/no-unencrypted-transmission';
import { noClickjacking } from './rules/security/no-clickjacking';

// Security rules - Data Exposure
import { noExposedSensitiveData } from './rules/security/no-exposed-sensitive-data';
import { noSensitiveDataExposure } from './rules/security/no-sensitive-data-exposure';

// Security rules - Buffer & Memory
import { noBufferOverread } from './rules/security/no-buffer-overread';

// Security rules - Resource & DoS
import { noUnlimitedResourceAllocation } from './rules/security/no-unlimited-resource-allocation';
import { noUncheckedLoopCondition } from './rules/security/no-unchecked-loop-condition';

// Security rules - Platform Specific
import { noElectronSecurityIssues } from './rules/security/no-electron-security-issues';
import { noInsufficientPostmessageValidation } from './rules/security/no-insufficient-postmessage-validation';

/**
 * Collection of all security ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Flat rule names (recommended usage)
  'no-sql-injection': noSqlInjection,
  'database-injection': databaseInjection,
  'detect-eval-with-expression': detectEvalWithExpression,
  'detect-child-process': detectChildProcess,
  'no-unsafe-dynamic-require': noUnsafeDynamicRequire,
  'no-graphql-injection': noGraphqlInjection,
  'no-xxe-injection': noXxeInjection,
  'no-xpath-injection': noXpathInjection,
  'no-ldap-injection': noLdapInjection,
  'no-directive-injection': noDirectiveInjection,
  'no-format-string-injection': noFormatStringInjection,
  'detect-non-literal-fs-filename': detectNonLiteralFsFilename,
  'no-zip-slip': noZipSlip,
  'no-toctou-vulnerability': noToctouVulnerability,
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'no-unsafe-regex-construction': noUnsafeRegexConstruction,
  'detect-object-injection': detectObjectInjection,
  'no-unsafe-deserialization': noUnsafeDeserialization,
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-weak-crypto': noWeakCrypto,
  'no-insufficient-random': noInsufficientRandom,
  'no-timing-attack': noTimingAttack,
  'no-insecure-comparison': noInsecureComparison,
  'no-insecure-jwt': noInsecureJwt,
  'no-unvalidated-user-input': noUnvalidatedUserInput,
  'no-unsanitized-html': noUnsanitizedHtml,
  'no-unescaped-url-parameter': noUnescapedUrlParameter,
  'no-improper-sanitization': noImproperSanitization,
  'no-improper-type-validation': noImproperTypeValidation,
  'no-missing-authentication': noMissingAuthentication,
  'no-privilege-escalation': noPrivilegeEscalation,
  'no-weak-password-recovery': noWeakPasswordRecovery,
  'no-insecure-cookie-settings': noInsecureCookieSettings,
  'no-missing-csrf-protection': noMissingCsrfProtection,
  'no-document-cookie': noDocumentCookie,
  'no-missing-cors-check': noMissingCorsCheck,
  'no-missing-security-headers': noMissingSecurityHeaders,
  'no-insecure-redirects': noInsecureRedirects,
  'no-unencrypted-transmission': noUnencryptedTransmission,
  'no-clickjacking': noClickjacking,
  'no-exposed-sensitive-data': noExposedSensitiveData,
  'no-sensitive-data-exposure': noSensitiveDataExposure,
  'no-buffer-overread': noBufferOverread,
  'no-unlimited-resource-allocation': noUnlimitedResourceAllocation,
  'no-unchecked-loop-condition': noUncheckedLoopCondition,
  'no-electron-security-issues': noElectronSecurityIssues,
  'no-insufficient-postmessage-validation': noInsufficientPostmessageValidation,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-secure-coding',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for security rules
 */
export const configs = {
  /**
   * Recommended security configuration
   * 
   * Enables all security rules with sensible severity levels:
   * - Critical injection vulnerabilities as errors
   * - Important security issues as warnings
   */
  recommended: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      // Critical - Injection vulnerabilities (OWASP A03)
      'secure-coding/no-sql-injection': 'error',
      'secure-coding/database-injection': 'error',
      'secure-coding/detect-eval-with-expression': 'error',
      'secure-coding/detect-child-process': 'error',
      'secure-coding/no-unsafe-dynamic-require': 'error',
      'secure-coding/no-graphql-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-ldap-injection': 'error',
      'secure-coding/no-directive-injection': 'error',
      'secure-coding/no-format-string-injection': 'error',
      
      // Critical - Path traversal & file operations
      'secure-coding/detect-non-literal-fs-filename': 'error',
      'secure-coding/no-zip-slip': 'error',
      'secure-coding/no-toctou-vulnerability': 'error',
      
      // Critical - Deserialization
      'secure-coding/no-unsafe-deserialization': 'error',
      
      // High - Regex vulnerabilities
      'secure-coding/detect-non-literal-regexp': 'warn',
      'secure-coding/no-redos-vulnerable-regex': 'error',
      'secure-coding/no-unsafe-regex-construction': 'warn',
      
      // High - Prototype pollution
      'secure-coding/detect-object-injection': 'warn',
      
      // Critical - Cryptography (OWASP A02)
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-weak-crypto': 'error',
      'secure-coding/no-insufficient-random': 'warn',
      'secure-coding/no-timing-attack': 'error',
      'secure-coding/no-insecure-comparison': 'warn',
      'secure-coding/no-insecure-jwt': 'error',
      
      // Critical - XSS vulnerabilities (OWASP A03)
      'secure-coding/no-unvalidated-user-input': 'warn',
      'secure-coding/no-unsanitized-html': 'error',
      'secure-coding/no-unescaped-url-parameter': 'warn',
      'secure-coding/no-improper-sanitization': 'error',
      'secure-coding/no-improper-type-validation': 'warn',
      
      // High - Authentication & Authorization (OWASP A01, A07)
      'secure-coding/no-missing-authentication': 'warn',
      'secure-coding/no-privilege-escalation': 'warn',
      'secure-coding/no-weak-password-recovery': 'error',
      
      // High - Session & Cookies
      'secure-coding/no-insecure-cookie-settings': 'warn',
      'secure-coding/no-missing-csrf-protection': 'warn',
      'secure-coding/no-document-cookie': 'warn',
      
      // High - Network & Headers (OWASP A05)
      'secure-coding/no-missing-cors-check': 'warn',
      'secure-coding/no-missing-security-headers': 'warn',
      'secure-coding/no-insecure-redirects': 'warn',
      'secure-coding/no-unencrypted-transmission': 'warn',
      'secure-coding/no-clickjacking': 'error',
      
      // High - Data Exposure (OWASP A01)
      'secure-coding/no-exposed-sensitive-data': 'error',
      'secure-coding/no-sensitive-data-exposure': 'warn',
      
      // Medium - Buffer & Memory
      'secure-coding/no-buffer-overread': 'error',
      
      // Medium - Resource & DoS
      'secure-coding/no-unlimited-resource-allocation': 'error',
      'secure-coding/no-unchecked-loop-condition': 'error',
      
      // Medium - Platform specific
      'secure-coding/no-electron-security-issues': 'error',
      'secure-coding/no-insufficient-postmessage-validation': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict security configuration
   * 
   * All security rules set to 'error' for maximum protection
   */
  strict: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`secure-coding/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * OWASP Top 10 focused configuration
   * 
   * Rules mapped to OWASP Top 10 2021 categories
   */
  'owasp-top-10': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      // A01:2021 – Broken Access Control
      'secure-coding/no-missing-authentication': 'error',
      'secure-coding/no-privilege-escalation': 'error',
      'secure-coding/no-exposed-sensitive-data': 'error',
      'secure-coding/no-insecure-redirects': 'error',
      
      // A02:2021 – Cryptographic Failures
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-weak-crypto': 'error',
      'secure-coding/no-insufficient-random': 'error',
      'secure-coding/no-insecure-jwt': 'error',
      'secure-coding/no-unencrypted-transmission': 'error',
      'secure-coding/no-sensitive-data-exposure': 'error',
      
      // A03:2021 – Injection
      'secure-coding/no-sql-injection': 'error',
      'secure-coding/database-injection': 'error',
      'secure-coding/detect-eval-with-expression': 'error',
      'secure-coding/detect-child-process': 'error',
      'secure-coding/no-graphql-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-ldap-injection': 'error',
      'secure-coding/no-unsanitized-html': 'error',
      'secure-coding/no-unescaped-url-parameter': 'error',
      
      // A04:2021 – Insecure Design
      'secure-coding/no-weak-password-recovery': 'error',
      'secure-coding/no-improper-type-validation': 'error',
      
      // A05:2021 – Security Misconfiguration
      'secure-coding/no-missing-security-headers': 'error',
      'secure-coding/no-missing-cors-check': 'error',
      'secure-coding/no-insecure-cookie-settings': 'error',
      'secure-coding/no-clickjacking': 'error',
      'secure-coding/no-electron-security-issues': 'error',
      
      // A07:2021 – Identification and Authentication Failures
      'secure-coding/no-timing-attack': 'error',
      'secure-coding/no-insecure-comparison': 'error',
      'secure-coding/no-missing-csrf-protection': 'error',
      
      // A08:2021 – Software and Data Integrity Failures
      'secure-coding/no-unsafe-deserialization': 'error',
      'secure-coding/no-unsafe-dynamic-require': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export all types from the types barrel
 */
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
  // Combined type
  AllSecurityRulesOptions,
} from './types/index';
