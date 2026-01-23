/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
 * @see https://github.com/ofri-peretz/eslint#readme
 */


// Security rules - Injection
import { noGraphqlInjection } from './rules/no-graphql-injection';
import { noXxeInjection } from './rules/no-xxe-injection';
import { noXpathInjection } from './rules/no-xpath-injection';
import { noLdapInjection } from './rules/no-ldap-injection';
import { noDirectiveInjection } from './rules/no-directive-injection';
import { noFormatStringInjection } from './rules/no-format-string-injection';

// Security rules - Path & File

// Security rules - Regex
import { detectNonLiteralRegexp } from './rules/detect-non-literal-regexp';
import { noRedosVulnerableRegex } from './rules/no-redos-vulnerable-regex';
import { noUnsafeRegexConstruction } from './rules/no-unsafe-regex-construction';

// Security rules - Object & Prototype
import { detectObjectInjection } from './rules/detect-object-injection';
import { noUnsafeDeserialization } from './rules/no-unsafe-deserialization';

// Security rules - Credentials & Crypto
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials';
import { noInsecureComparison } from './rules/no-insecure-comparison';

// Security rules - Input Validation & XSS
import { noUnvalidatedUserInput } from './rules/no-unvalidated-user-input';
import { noUnescapedUrlParameter } from './rules/no-unescaped-url-parameter';
import { noImproperSanitization } from './rules/no-improper-sanitization';
import { noImproperTypeValidation } from './rules/no-improper-type-validation';

// Security rules - Authentication & Authorization
import { noMissingAuthentication } from './rules/no-missing-authentication';
import { noPrivilegeEscalation } from './rules/no-privilege-escalation';
import { noWeakPasswordRecovery } from './rules/no-weak-password-recovery';

// Security rules - Session & Cookies
import { noMissingCsrfProtection } from './rules/no-missing-csrf-protection';

// Security rules - Network & Headers
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';
import { noInsecureRedirects } from './rules/no-insecure-redirects';
import { noUnencryptedTransmission } from './rules/no-unencrypted-transmission';
import { noClickjacking } from './rules/no-clickjacking';

// Security rules - Data Exposure
import { noSensitiveDataExposure } from './rules/no-sensitive-data-exposure';

// Security rules - Buffer & Memory

// Security rules - Resource & DoS
import { noUnlimitedResourceAllocation } from './rules/no-unlimited-resource-allocation';
import { noUncheckedLoopCondition } from './rules/no-unchecked-loop-condition';

// Security rules - Platform Specific
import { noElectronSecurityIssues } from './rules/no-electron-security-issues';


// OWASP Mobile Top 10 2023/2024 - Mobile Security Rules (40 rules)
// M1: Improper Credential Usage (3 rules)
import { noCredentialsInQueryParams } from './rules/no-credentials-in-query-params';
import { requireSecureCredentialStorage } from './rules/require-secure-credential-storage';

// M2: Inadequate Supply Chain Security (4 rules)
import { requireDependencyIntegrity } from './rules/require-dependency-integrity';
import { detectSuspiciousDependencies } from './rules/detect-suspicious-dependencies';
import { noDynamicDependencyLoading } from './rules/no-dynamic-dependency-loading';
import { lockFile } from './rules/lock-file';

// M3: Insecure Authentication/Authorization (5 rules)
import { noClientSideAuthLogic } from './rules/no-client-side-auth-logic';
import { requireBackendAuthorization } from './rules/require-backend-authorization';
import { noHardcodedSessionTokens } from './rules/no-hardcoded-session-tokens';
import { detectWeakPasswordValidation } from './rules/detect-weak-password-validation';
import { noPasswordInUrl } from './rules/no-password-in-url';

// M4: Insufficient Input/Output Validation (6 rules)
import { noUnvalidatedDeeplinks } from './rules/no-unvalidated-deeplinks';
import { requireUrlValidation } from './rules/require-url-validation';
import { requireMimeTypeValidation } from './rules/require-mime-type-validation';
import { requireCspHeaders } from './rules/require-csp-headers';

// M5: Insecure Communication (7 rules)
import { noHttpUrls } from './rules/no-http-urls';
import { noDisabledCertificateValidation } from './rules/no-disabled-certificate-validation';
import { requireHttpsOnly } from './rules/require-https-only';
import { noInsecureWebsocket } from './rules/no-insecure-websocket';
import { detectMixedContent } from './rules/detect-mixed-content';
import { noAllowArbitraryLoads } from './rules/no-allow-arbitrary-loads';
import { requireNetworkTimeout } from './rules/require-network-timeout';

// M6: Inadequate Privacy Controls (4 rules)
import { noPiiInLogs } from './rules/no-pii-in-logs';
import { noTrackingWithoutConsent } from './rules/no-tracking-without-consent';
import { requireDataMinimization } from './rules/require-data-minimization';
import { noSensitiveDataInCache } from './rules/no-sensitive-data-in-cache';
import { noSensitiveDataInAnalytics } from './rules/no-sensitive-data-in-analytics';

// M7: Insufficient Binary Protections (2 rules)
import { noDebugCodeInProduction } from './rules/no-debug-code-in-production';
import { requireCodeMinification } from './rules/require-code-minification';

// M8: Security Misconfiguration (4 rules)
import { noVerboseErrorMessages } from './rules/no-verbose-error-messages';
import { requireSecureDefaults } from './rules/require-secure-defaults';
import { noPermissiveCors } from './rules/no-permissive-cors';

// M9: Insecure Data Storage (5 rules)
import { requireStorageEncryption } from './rules/require-storage-encryption';
import { requireSecureDeletion } from './rules/require-secure-deletion';

import { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of all security ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Flat rule names (recommended usage)
  'no-graphql-injection': noGraphqlInjection,
  'no-xxe-injection': noXxeInjection,
  'no-xpath-injection': noXpathInjection,
  'no-ldap-injection': noLdapInjection,
  'no-directive-injection': noDirectiveInjection,
  'no-format-string-injection': noFormatStringInjection,
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'no-unsafe-regex-construction': noUnsafeRegexConstruction,
  'detect-object-injection': detectObjectInjection,
  'no-unsafe-deserialization': noUnsafeDeserialization,
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-insecure-comparison': noInsecureComparison,
  'no-unvalidated-user-input': noUnvalidatedUserInput,
  'no-unescaped-url-parameter': noUnescapedUrlParameter,
  'no-improper-sanitization': noImproperSanitization,
  'no-improper-type-validation': noImproperTypeValidation,
  'no-missing-authentication': noMissingAuthentication,
  'no-privilege-escalation': noPrivilegeEscalation,
  'no-weak-password-recovery': noWeakPasswordRecovery,
  'no-missing-csrf-protection': noMissingCsrfProtection,
  'no-missing-cors-check': noMissingCorsCheck,
  'no-missing-security-headers': noMissingSecurityHeaders,
  'no-insecure-redirects': noInsecureRedirects,
  'no-unencrypted-transmission': noUnencryptedTransmission,
  'no-clickjacking': noClickjacking,
  'no-sensitive-data-exposure': noSensitiveDataExposure,
  'no-unlimited-resource-allocation': noUnlimitedResourceAllocation,
  'no-unchecked-loop-condition': noUncheckedLoopCondition,
  'no-electron-security-issues': noElectronSecurityIssues,

  // OWASP Mobile Top 10 2023/2024 rules (40 rules)
  // M1: Improper Credential Usage (3 rules)
  'no-credentials-in-query-params': noCredentialsInQueryParams,
  'require-secure-credential-storage': requireSecureCredentialStorage,

  // M2: Inadequate Supply Chain Security (4 rules)
  'require-dependency-integrity': requireDependencyIntegrity,
  'detect-suspicious-dependencies': detectSuspiciousDependencies,
  'no-dynamic-dependency-loading': noDynamicDependencyLoading,
  'lock-file': lockFile,

  // M3: Insecure Authentication/Authorization (5 rules)
  'no-client-side-auth-logic': noClientSideAuthLogic,
  'require-backend-authorization': requireBackendAuthorization,
  'no-hardcoded-session-tokens': noHardcodedSessionTokens,
  'detect-weak-password-validation': detectWeakPasswordValidation,
  'no-password-in-url': noPasswordInUrl,

  // M4: Insufficient Input/Output Validation (6 rules)
  'no-unvalidated-deeplinks': noUnvalidatedDeeplinks,
  'require-url-validation': requireUrlValidation,
  'require-mime-type-validation': requireMimeTypeValidation,
  'require-csp-headers': requireCspHeaders,

  // M5: Insecure Communication (7 rules)
  'no-http-urls': noHttpUrls,
  'no-disabled-certificate-validation': noDisabledCertificateValidation,
  'require-https-only': requireHttpsOnly,
  'no-insecure-websocket': noInsecureWebsocket,
  'detect-mixed-content': detectMixedContent,
  'no-allow-arbitrary-loads': noAllowArbitraryLoads,
  'require-network-timeout': requireNetworkTimeout,

  // M6: Inadequate Privacy Controls (4 rules)
  'no-pii-in-logs': noPiiInLogs,
  'no-tracking-without-consent': noTrackingWithoutConsent,
  'require-data-minimization': requireDataMinimization,
  'no-sensitive-data-in-analytics': noSensitiveDataInAnalytics,

  // M7: Insufficient Binary Protections (2 rules)
  'no-debug-code-in-production': noDebugCodeInProduction,
  'require-code-minification': requireCodeMinification,

  // M8: Security Misconfiguration (4 rules)
  'no-verbose-error-messages': noVerboseErrorMessages,
  'require-secure-defaults': requireSecureDefaults,
  'no-permissive-cors': noPermissiveCors,

  // M9: Insecure Data Storage (5 rules)
  'no-sensitive-data-in-cache': noSensitiveDataInCache,
  'require-storage-encryption': requireStorageEncryption,
  'require-secure-deletion': requireSecureDeletion,
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
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - Injection vulnerabilities (OWASP A03)
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
  'secure-coding/no-insecure-comparison': 'warn',

  // Critical - XSS vulnerabilities (OWASP A03)
  'secure-coding/no-unvalidated-user-input': 'warn',
  'secure-coding/no-unescaped-url-parameter': 'warn',
  'secure-coding/no-improper-sanitization': 'error',
  'secure-coding/no-improper-type-validation': 'warn',

  // High - Authentication & Authorization (OWASP A01, A07)
  'secure-coding/no-missing-authentication': 'warn',
  'secure-coding/no-privilege-escalation': 'warn',
  'secure-coding/no-weak-password-recovery': 'error',

  // High - Session & Cookies
  'secure-coding/no-missing-csrf-protection': 'warn',

  // High - Network & Headers (OWASP A05)
  'secure-coding/no-missing-cors-check': 'warn',
  'secure-coding/no-missing-security-headers': 'warn',
  'secure-coding/no-insecure-redirects': 'warn',
  'secure-coding/no-unencrypted-transmission': 'warn',
  'secure-coding/no-clickjacking': 'error',

  // High - Data Exposure (OWASP A01)
  'secure-coding/no-sensitive-data-exposure': 'warn',

  // Medium - Resource & DoS
  'secure-coding/no-unlimited-resource-allocation': 'error',
  'secure-coding/no-unchecked-loop-condition': 'error',

  // Medium - Platform specific
  'secure-coding/no-electron-security-issues': 'error',

  // Mobile & General Security (OWASP Mobile)
  'secure-coding/no-credentials-in-query-params': 'error',
  'secure-coding/no-http-urls': 'error',
  'secure-coding/require-https-only': 'error',
  'secure-coding/no-pii-in-logs': 'warn',
  'secure-coding/no-verbose-error-messages': 'warn',
  'secure-coding/no-hardcoded-session-tokens': 'error',
  'secure-coding/detect-mixed-content': 'error',
  'secure-coding/no-unvalidated-deeplinks': 'error',
  'secure-coding/no-insecure-websocket': 'error',
  'secure-coding/detect-suspicious-dependencies': 'warn',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {

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
    rules: recommendedRules,
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
      'secure-coding/no-insecure-redirects': 'error',
      
      // A02:2021 – Cryptographic Failures
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-unencrypted-transmission': 'error',
      'secure-coding/no-sensitive-data-exposure': 'error',
      
      // A03:2021 – Injection
      'secure-coding/no-graphql-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-ldap-injection': 'error',
      'secure-coding/no-unescaped-url-parameter': 'error',
      
      // A04:2021 – Insecure Design
      'secure-coding/no-weak-password-recovery': 'error',
      'secure-coding/no-improper-type-validation': 'error',
      
      // A05:2021 – Security Misconfiguration
      'secure-coding/no-missing-security-headers': 'error',
      'secure-coding/no-missing-cors-check': 'error',
      'secure-coding/no-clickjacking': 'error',
      'secure-coding/no-electron-security-issues': 'error',
      
      // A07:2021 – Identification and Authentication Failures
      'secure-coding/no-insecure-comparison': 'error',
      'secure-coding/no-missing-csrf-protection': 'error',
      
      // A08:2021 – Software and Data Integrity Failures
      'secure-coding/no-unsafe-deserialization': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * OWASP Mobile Top 10 focused configuration
   * 
   * Rules mapped to OWASP Mobile Top 10 2024 categories
   */
  'owasp-mobile-top-10': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      // M1: Improper Credential Usage
      'secure-coding/no-credentials-in-query-params': 'error',
      'secure-coding/require-secure-credential-storage': 'error',
      'secure-coding/no-hardcoded-credentials': 'error',

      // M2: Inadequate Supply Chain Security
      'secure-coding/require-dependency-integrity': 'error',
      'secure-coding/detect-suspicious-dependencies': 'error',
      'secure-coding/no-dynamic-dependency-loading': 'error',
      'secure-coding/lock-file': 'error',

      // M3: Insecure Authentication/Authorization
      'secure-coding/no-client-side-auth-logic': 'error',
      'secure-coding/require-backend-authorization': 'error',
      'secure-coding/no-hardcoded-session-tokens': 'error',
      'secure-coding/detect-weak-password-validation': 'error',
      'secure-coding/no-password-in-url': 'error',

      // M4: Insufficient Input/Output Validation
      'secure-coding/no-unvalidated-deeplinks': 'error',
      'secure-coding/require-url-validation': 'error',
      'secure-coding/require-mime-type-validation': 'error',
      'secure-coding/require-csp-headers': 'error',

      // M5: Insecure Communication
      'secure-coding/no-http-urls': 'error',
      'secure-coding/no-disabled-certificate-validation': 'error',
      'secure-coding/require-https-only': 'error',
      'secure-coding/no-insecure-websocket': 'error',
      'secure-coding/detect-mixed-content': 'error',
      'secure-coding/no-allow-arbitrary-loads': 'error',
      'secure-coding/require-network-timeout': 'error',
      
      // M6: Inadequate Privacy Controls
      'secure-coding/no-pii-in-logs': 'error',
      'secure-coding/no-tracking-without-consent': 'error',
      'secure-coding/require-data-minimization': 'error',
      'secure-coding/no-sensitive-data-in-analytics': 'error',

      // M7: Insufficient Binary Protections
      'secure-coding/no-debug-code-in-production': 'error',
      'secure-coding/require-code-minification': 'error',

      // M8: Security Misconfiguration
      'secure-coding/no-verbose-error-messages': 'error',
      'secure-coding/require-secure-defaults': 'error',
      'secure-coding/no-permissive-cors': 'error',

      // M9: Insecure Data Storage
      'secure-coding/no-sensitive-data-in-cache': 'error',
      'secure-coding/require-storage-encryption': 'error',
      'secure-coding/require-secure-deletion': 'error',
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
  // Combined type
  AllSecurityRulesOptions,
} from './types/index';
