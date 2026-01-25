/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-crypto
 *
 * ⛔ DEPRECATED: This plugin is being phased out.
 * Rules have been redistributed to:
 * - node-security (18 rules for node:crypto hardening)
 * - browser-security (1 rule for Web Crypto API)  
 * - secure-coding (5 rules for general crypto patterns)
 *
 * This plugin now contains only the remaining local rules.
 *
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto
 */

// Local rules that still exist in this plugin
import { noHardcodedCryptoKey } from './rules/no-hardcoded-crypto-key';
import { noKeyReuse } from './rules/no-key-reuse';
import { noMathRandomCrypto } from './rules/no-math-random-crypto';
import { noNumericOnlyTokens } from './rules/no-numeric-only-tokens';
import { noPredictableSalt } from './rules/no-predictable-salt';
import { noWebCryptoExport } from './rules/no-web-crypto-export';
import { requireAuthenticatedEncryption } from './rules/require-authenticated-encryption';
import { requireKeyLength } from './rules/require-key-length';
import { requireRandomIv } from './rules/require-random-iv';
import { requireSecurePbkdf2Digest } from './rules/require-secure-pbkdf2-digest';
import { requireSufficientLength } from './rules/require-sufficient-length';

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of crypto security rules (11 remaining in this deprecated plugin)
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'no-hardcoded-crypto-key': noHardcodedCryptoKey,
  'no-key-reuse': noKeyReuse,
  'no-math-random-crypto': noMathRandomCrypto,
  'no-numeric-only-tokens': noNumericOnlyTokens,
  'no-predictable-salt': noPredictableSalt,
  'no-web-crypto-export': noWebCryptoExport,
  'require-authenticated-encryption': requireAuthenticatedEncryption,
  'require-key-length': requireKeyLength,
  'require-random-iv': requireRandomIv,
  'require-secure-pbkdf2-digest': requireSecurePbkdf2Digest,
  'require-sufficient-length': requireSufficientLength,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-crypto',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended rules - balanced between security and practicality
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  'crypto/no-hardcoded-crypto-key': 'error',
  'crypto/no-math-random-crypto': 'error',
  'crypto/require-secure-pbkdf2-digest': 'error',
  'crypto/no-predictable-salt': 'error',
  'crypto/require-sufficient-length': 'warn',
  'crypto/no-numeric-only-tokens': 'warn',
  'crypto/require-authenticated-encryption': 'warn',
  'crypto/no-key-reuse': 'warn',
  'crypto/require-key-length': 'warn',
  'crypto/no-web-crypto-export': 'warn',
  'crypto/require-random-iv': 'warn',
};

/**
 * Preset configurations
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended configuration - sensible defaults
   */
  recommended: {
    plugins: {
      crypto: plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict configuration - all rules as errors
   */
  strict: {
    plugins: {
      crypto: plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [`crypto/${ruleName}`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export all types
 */
export * from './types/index';
