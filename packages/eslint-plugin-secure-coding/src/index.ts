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

// Security rules - Auth & runtime hardening (wired 2026-05-09 — implementations existed but were unregistered)
import { detectWeakPasswordValidation } from './rules/detect-weak-password-validation';
import { noElectronSecurityIssues } from './rules/no-electron-security-issues';
import { noHardcodedSessionTokens } from './rules/no-hardcoded-session-tokens';
import { requireSecureDefaults } from './rules/require-secure-defaults';


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

  // Auth & runtime hardening (4 rules — wired 2026-05-09)
  'detect-weak-password-validation': detectWeakPasswordValidation,
  'no-electron-security-issues': noElectronSecurityIssues,
  'no-hardcoded-session-tokens': noHardcodedSessionTokens,
  'require-secure-defaults': requireSecureDefaults,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-secure-coding',
    version: '3.2.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for security rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - Injection vulnerabilities
  // no-graphql-injection demoted to 'warn' 2026-05-09 — `npm run ilb:severity-audit`
  // showed 61% of Wild hits on adversarial Edge code. Fails the README §1
  // ≥ 95% precision floor for `error`-tier severity.
  'secure-coding/no-graphql-injection': 'warn',
  'secure-coding/no-xxe-injection': 'error',
  'secure-coding/no-xpath-injection': 'error',
  'secure-coding/no-ldap-injection': 'error',

  // Critical - Deserialization
  // Demoted 2026-05-09 — 76% Edge ratio.
  'secure-coding/no-unsafe-deserialization': 'warn',

  // High - Regex vulnerabilities
  'secure-coding/detect-non-literal-regexp': 'warn',
  // Demoted 2026-05-09 — 91% Edge ratio.
  'secure-coding/no-redos-vulnerable-regex': 'error',
  'secure-coding/no-unsafe-regex-construction': 'error',

  // High - Prototype pollution
  'secure-coding/detect-object-injection': 'warn',

  // Critical - Credentials
  'secure-coding/no-hardcoded-credentials': 'error',
  'secure-coding/no-insecure-comparison': 'warn',

  // Critical - Data integrity
  'secure-coding/no-improper-sanitization': 'error',

  // High - Logic
  // NOTE: no-missing-authentication and require-backend-authorization are deprecated in
  // secure-coding — they assume Express route handler context and belong in express-security.
  // Kept in the rules registry for backwards compat; removed from flagship config.
  'secure-coding/no-privilege-escalation': 'warn',
  'secure-coding/no-weak-password-recovery': 'warn', // naming heuristic — demoted

  // High - Exposure
  'secure-coding/no-sensitive-data-exposure': 'warn',

  // Medium - Resource & DoS
  // Demoted 2026-05-09 — both rules fail the volume-error-risk gate
  // (firing ≥ 100 times on Wild without sufficient fixture coverage to
  // guarantee precision). Rules were also flagged for ≥ 76% Edge ratio.
  'secure-coding/no-unlimited-resource-allocation': 'warn',
  'secure-coding/no-unchecked-loop-condition': 'warn',
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — the two rules from this plugin in the ecosystem-wide
   * flagship list (`.agent/flagship-rules.md`). Use this when you want the
   * highest-signal security subset shippable in CI gates without the noise
   * of `recommended`.
   */
  flagship: {
    plugins: {
      'secure-coding': plugin,
    },
    rules: {
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-redos-vulnerable-regex': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

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
   * Recommended-strict configuration
   *
   * Same rule set as `recommended` but every rule is promoted to `'error'`.
   * Use this when you want CI to block on all security findings rather than
   * only warning on lower-confidence rules.
   *
   * This is the configuration independently chosen by production teams who
   * audit `recommended` and decide they want zero tolerance on all 16 rules.
   */
  'recommended-strict': {
    plugins: {
      'secure-coding': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(recommendedRules).map((rule) => [rule, 'error']),
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict security configuration
   *
   * ALL rules (including experimental and opinionated ones) set to 'error'.
   * Prefer `recommended-strict` unless you specifically need full coverage.
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
      // no-missing-authentication removed: Express-specific, use express-security plugin instead
      'secure-coding/no-privilege-escalation': 'warn',
      
      // A02:2021 – Cryptographic Failures
      'secure-coding/no-hardcoded-credentials': 'error',
      // Demoted from 'error': naming-heuristic detection (fires on variable names
      // that sound sensitive). Cannot be enforcement-grade per I3 invariant.
      'secure-coding/no-sensitive-data-exposure': 'warn',
      
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

