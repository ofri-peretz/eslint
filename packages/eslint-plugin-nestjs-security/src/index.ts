/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-nestjs-security
 *
 * A comprehensive security-focused ESLint plugin for NestJS applications
 * with rules for detecting and preventing security vulnerabilities.
 *
 * Features:
 * - LLM-optimized error messages with CWE references
 * - OWASP Top 10 coverage
 * - NestJS-specific security patterns
 * - Guards, validation pipes, and throttler detection
 *
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import { TSESLint } from '@interlace/eslint-devkit';

// P0 Critical Rules
import { requireGuards } from './rules/require-guards';
import { noMissingValidationPipe } from './rules/no-missing-validation-pipe';
import { requireThrottler } from './rules/require-throttler';

// P1 Rules
import { requireClassValidator } from './rules/require-class-validator';
import { noExposedPrivateFields } from './rules/no-exposed-private-fields';

/**
 * Collection of all NestJS security ESLint rules
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // P0 Critical - Access Control
  'require-guards': requireGuards,
  'no-missing-validation-pipe': noMissingValidationPipe,
  'require-throttler': requireThrottler,

  // P1 - Data Validation & Exposure
  'require-class-validator': requireClassValidator,
  'no-exposed-private-fields': noExposedPrivateFields,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-nestjs-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended configuration - balanced security enforcement
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // P0 Critical - Access Control
  'nestjs-security/require-guards': 'error',
  'nestjs-security/no-missing-validation-pipe': 'warn',
  'nestjs-security/require-throttler': 'warn',

  // P1 - Data Validation
  'nestjs-security/require-class-validator': 'warn',
  'nestjs-security/no-exposed-private-fields': 'warn',
};

/**
 * Preset configurations for NestJS security rules
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended security configuration
   *
   * Enables all security rules with sensible severity levels
   */
  recommended: {
    plugins: {
      'nestjs-security': plugin,
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
      'nestjs-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [
        `nestjs-security/${ruleName}`,
        'error',
      ])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Guards-only configuration
   *
   * Access control rules only
   */
  guards: {
    plugins: {
      'nestjs-security': plugin,
    },
    rules: {
      'nestjs-security/require-guards': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Validation-only configuration
   *
   * Input validation rules only
   */
  validation: {
    plugins: {
      'nestjs-security': plugin,
    },
    rules: {
      'nestjs-security/no-missing-validation-pipe': 'error',
      'nestjs-security/require-class-validator': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export rule options types
 */
export type { Options as RequireGuardsOptions } from './rules/require-guards';
export type { Options as NoMissingValidationPipeOptions } from './rules/no-missing-validation-pipe';
export type { Options as RequireThrottlerOptions } from './rules/require-throttler';
export type { Options as RequireClassValidatorOptions } from './rules/require-class-validator';
export type { Options as NoExposedPrivateFieldsOptions } from './rules/no-exposed-private-fields';

/**
 * Combined options type for all rules
 */
export interface AllNestjsSecurityRulesOptions {
  'require-guards'?: import('./rules/require-guards').Options;
  'no-missing-validation-pipe'?: import('./rules/no-missing-validation-pipe').Options;
  'require-throttler'?: import('./rules/require-throttler').Options;
  'require-class-validator'?: import('./rules/require-class-validator').Options;
  'no-exposed-private-fields'?: import('./rules/no-exposed-private-fields').Options;
}
