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
import { requireValidationPipeWhitelist } from './rules/require-validation-pipe-whitelist';
import { noPermissiveCors } from './rules/no-permissive-cors';

// P1 Rules
import { noExposedPrivateFields } from './rules/no-exposed-private-fields';
import { noResBypassSerialization } from './rules/no-res-bypass-serialization';
import { noUnguardedSwagger } from './rules/no-unguarded-swagger';
import { noHybridAppConfigLoss } from './rules/no-hybrid-app-config-loss';

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
  'require-validation-pipe-whitelist': requireValidationPipeWhitelist,
  'no-permissive-cors': noPermissiveCors,

  // P1 - Data Validation & Exposure
  'no-exposed-private-fields': noExposedPrivateFields,
  'no-res-bypass-serialization': noResBypassSerialization,
  'no-unguarded-swagger': noUnguardedSwagger,
  'no-hybrid-app-config-loss': noHybridAppConfigLoss,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-nestjs-security',
    version: '2.1.0',
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
  // Both enter at 'error': each is a narrow, statically-decidable misconfiguration
  // with no legitimate use, and each was wrong in real apps we measured.
  'nestjs-security/require-validation-pipe-whitelist': 'error',
  'nestjs-security/no-permissive-cors': 'error',

  // P1 - Data Validation
  'nestjs-security/no-exposed-private-fields': 'warn',
  'nestjs-security/no-res-bypass-serialization': 'warn',
  'nestjs-security/no-unguarded-swagger': 'warn',
  // Enters at 'error': the absence is statically visible, it has no benign
  // reading once the project registers globals, and every hybrid app measured
  // was in the failing state.
  'nestjs-security/no-hybrid-app-config-loss': 'error',
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
      ]),
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
      'nestjs-security/require-validation-pipe-whitelist': 'error',
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
export type { Options as RequireValidationPipeWhitelistOptions } from './rules/require-validation-pipe-whitelist';
export type { Options as NoPermissiveCorsOptions } from './rules/no-permissive-cors';
export type { Options as NoExposedPrivateFieldsOptions } from './rules/no-exposed-private-fields';
export type { Options as NoResBypassSerializationOptions } from './rules/no-res-bypass-serialization';
export type { Options as NoUnguardedSwaggerOptions } from './rules/no-unguarded-swagger';
export type { Options as NoHybridAppConfigLossOptions } from './rules/no-hybrid-app-config-loss';

/**
 * Combined options type for all rules
 */
export interface AllNestjsSecurityRulesOptions {
  'require-guards'?: import('./rules/require-guards').Options;
  'no-missing-validation-pipe'?: import('./rules/no-missing-validation-pipe').Options;
  'require-throttler'?: import('./rules/require-throttler').Options;
  'require-validation-pipe-whitelist'?: import('./rules/require-validation-pipe-whitelist').Options;
  'no-permissive-cors'?: import('./rules/no-permissive-cors').Options;
  'no-exposed-private-fields'?: import('./rules/no-exposed-private-fields').Options;
  'no-res-bypass-serialization'?: import('./rules/no-res-bypass-serialization').Options;
  'no-unguarded-swagger'?: import('./rules/no-unguarded-swagger').Options;
  'no-hybrid-app-config-loss'?: import('./rules/no-hybrid-app-config-loss').Options;
}
