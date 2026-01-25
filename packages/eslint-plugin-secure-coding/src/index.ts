/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-secure-coding
 * 
 * A comprehensive security-focused ESLint plugin restricted to "pure coding security rules"
 * (logic, AST patterns, and generic vulnerabilities independent of environment).
 * 
 * Rules focus on:
 * - Language-level logic flaws
 * - AST pattern risks
 * - Generic injection patterns
 * - Cryptographic logic (logic level)
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

// Security rules - Input Validation
import { noImproperSanitization } from './rules/no-improper-sanitization';
import { noImproperTypeValidation } from './rules/no-improper-type-validation';

// Security rules - Authentication & Authorization
import { noMissingAuthentication } from './rules/no-missing-authentication';
import { noPrivilegeEscalation } from './rules/no-privilege-escalation';
import { noWeakPasswordRecovery } from './rules/no-weak-password-recovery';
import { requireBackendAuthorization } from './rules/require-backend-authorization';

// Security rules - Data Exposure
import { noSensitiveDataExposure } from './rules/no-sensitive-data-exposure';
import { noPiiInLogs } from './rules/no-pii-in-logs';

// Security rules - Resource & DoS
import { noUnlimitedResourceAllocation } from './rules/no-unlimited-resource-allocation';
import { noUncheckedLoopCondition } from './rules/no-unchecked-loop-condition';


import { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of all core security ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Fundamental Injection (6 rules)
  'no-graphql-injection': noGraphqlInjection,
  'no-xxe-injection': noXxeInjection,
  'no-xpath-injection': noXpathInjection,
  'no-ldap-injection': noLdapInjection,
  'no-directive-injection': noDirectiveInjection,
  'no-format-string-injection': noFormatStringInjection,

  // Regex Safety & Stability (3 rules)
  'detect-non-literal-regexp': detectNonLiteralRegexp,
  'no-redos-vulnerable-regex': noRedosVulnerableRegex,
  'no-unsafe-regex-construction': noUnsafeRegexConstruction,

  // Data & Logic Integrity (5 rules)
  'detect-object-injection': detectObjectInjection,
  'no-unsafe-deserialization': noUnsafeDeserialization,
  'no-insecure-comparison': noInsecureComparison,
  'no-improper-sanitization': noImproperSanitization,
  'no-improper-type-validation': noImproperTypeValidation,

  // Auth/Access Logic (4 rules)
  'no-missing-authentication': noMissingAuthentication,
  'no-privilege-escalation': noPrivilegeEscalation,
  'no-weak-password-recovery': noWeakPasswordRecovery,
  'require-backend-authorization': requireBackendAuthorization,

  // Secrets & Exposure (3 rules)
  'no-hardcoded-credentials': noHardcodedCredentials,
  'no-sensitive-data-exposure': noSensitiveDataExposure,
  'no-pii-in-logs': noPiiInLogs,

  // Resource Handling (2 rules)
  'no-unlimited-resource-allocation': noUnlimitedResourceAllocation,
  'no-unchecked-loop-condition': noUncheckedLoopCondition,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-secure-coding',
    version: '1.1.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for security rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - Injection vulnerabilities
  'secure-coding/no-graphql-injection': 'error',
  'secure-coding/no-xxe-injection': 'error',
  'secure-coding/no-xpath-injection': 'error',
  'secure-coding/no-ldap-injection': 'error',

  // Critical - Deserialization
  'secure-coding/no-unsafe-deserialization': 'error',

  // High - Regex vulnerabilities
  'secure-coding/detect-non-literal-regexp': 'warn',
  'secure-coding/no-redos-vulnerable-regex': 'error',
  'secure-coding/no-unsafe-regex-construction': 'warn',

  // High - Prototype pollution
  'secure-coding/detect-object-injection': 'warn',

  // Critical - Credentials
  'secure-coding/no-hardcoded-credentials': 'error',
  'secure-coding/no-insecure-comparison': 'warn',

  // Critical - Data integrity
  'secure-coding/no-improper-sanitization': 'error',

  // High - Logic
  'secure-coding/no-missing-authentication': 'warn',
  'secure-coding/no-privilege-escalation': 'warn',
  'secure-coding/no-weak-password-recovery': 'error',

  // High - Exposure
  'secure-coding/no-sensitive-data-exposure': 'warn',

  // Medium - Resource & DoS
  'secure-coding/no-unlimited-resource-allocation': 'error',
  'secure-coding/no-unchecked-loop-condition': 'error',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {

  /**
   * Recommended security configuration
   * 
   * Enables all core security rules with sensible severity levels.
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
   * All security rules set to 'error' for maximum protection.
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
   * Rules mapped to OWASP Top 10 2021 categories.
   */
  'owasp-top-10': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      // A01:2021 – Broken Access Control
      'secure-coding/no-missing-authentication': 'error',
      'secure-coding/no-privilege-escalation': 'error',
      
      // A02:2021 – Cryptographic Failures
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-sensitive-data-exposure': 'error',
      
      // A03:2021 – Injection
      'secure-coding/no-graphql-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-ldap-injection': 'error',
      
      // A04:2021 – Insecure Design
      'secure-coding/no-weak-password-recovery': 'error',
      'secure-coding/no-improper-type-validation': 'error',
      
      // A07:2021 – Identification and Authentication Failures
      'secure-coding/no-insecure-comparison': 'error',
      
      // A08:2021 – Software and Data Integrity Failures
      'secure-coding/no-unsafe-deserialization': 'error',
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
  AllSecurityRulesOptions,
} from './types/index';

