/**
 * eslint-plugin-crypto
 *
 * Security-focused ESLint plugin with 24 rules for cryptographic best practices.
 * Covers Node.js crypto, crypto-hash, crypto-random-string, cryptojs, and Web Crypto.
 *
 * Features:
 * - LLM-optimized error messages with CWE references
 * - Auto-fix suggestions where safe
 * - OWASP-aligned recommendations
 * - CVE-specific detection (CVE-2023-46809, CVE-2020-36732, CVE-2023-46233)
 *
 * @see https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto
 */

// Core Node.js crypto rules
import { noWeakHashAlgorithm } from './rules/no-weak-hash-algorithm';
import { noWeakCipherAlgorithm } from './rules/no-weak-cipher-algorithm';
import { noDeprecatedCipherMethod } from './rules/no-deprecated-cipher-method';
import { noStaticIv } from './rules/no-static-iv';
import { noEcbMode } from './rules/no-ecb-mode';
import { noInsecureKeyDerivation } from './rules/no-insecure-key-derivation';
import { noHardcodedCryptoKey } from './rules/no-hardcoded-crypto-key';
import { requireRandomIv } from './rules/require-random-iv';

// crypto-hash package rules
import { noSha1Hash } from './rules/no-sha1-hash';

// crypto-random-string package rules
import { requireSufficientLength } from './rules/require-sufficient-length';
import { noNumericOnlyTokens } from './rules/no-numeric-only-tokens';

// cryptojs package rules
import { noCryptojs } from './rules/no-cryptojs';
import { noCryptojsWeakRandom } from './rules/no-cryptojs-weak-random';
import { preferNativeCrypto } from './rules/prefer-native-crypto';

// NEW: CVE and advanced security rules
import { noMathRandomCrypto } from './rules/no-math-random-crypto';
import { noInsecureRsaPadding } from './rules/no-insecure-rsa-padding';
import { requireSecurePbkdf2Digest } from './rules/require-secure-pbkdf2-digest';
import { noPredictableSalt } from './rules/no-predictable-salt';
import { requireAuthenticatedEncryption } from './rules/require-authenticated-encryption';
import { noKeyReuse } from './rules/no-key-reuse';
import { noSelfSignedCerts } from './rules/no-self-signed-certs';
import { noTimingUnsafeCompare } from './rules/no-timing-unsafe-compare';
import { requireKeyLength } from './rules/require-key-length';
import { noWebCryptoExport } from './rules/no-web-crypto-export';

import type { TSESLint } from '@interlace/eslint-devkit';

/**
 * Collection of all crypto security rules (24 total)
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Core Node.js crypto rules (8)
  'no-weak-hash-algorithm': noWeakHashAlgorithm,
  'no-weak-cipher-algorithm': noWeakCipherAlgorithm,
  'no-deprecated-cipher-method': noDeprecatedCipherMethod,
  'no-static-iv': noStaticIv,
  'no-ecb-mode': noEcbMode,
  'no-insecure-key-derivation': noInsecureKeyDerivation,
  'no-hardcoded-crypto-key': noHardcodedCryptoKey,
  'require-random-iv': requireRandomIv,

  // crypto-hash package rules (1)
  'no-sha1-hash': noSha1Hash,

  // crypto-random-string package rules (2)
  'require-sufficient-length': requireSufficientLength,
  'no-numeric-only-tokens': noNumericOnlyTokens,

  // cryptojs package rules (3)
  'no-cryptojs': noCryptojs,
  'no-cryptojs-weak-random': noCryptojsWeakRandom,
  'prefer-native-crypto': preferNativeCrypto,

  // Advanced security rules (10)
  'no-math-random-crypto': noMathRandomCrypto,
  'no-insecure-rsa-padding': noInsecureRsaPadding,
  'require-secure-pbkdf2-digest': requireSecurePbkdf2Digest,
  'no-predictable-salt': noPredictableSalt,
  'require-authenticated-encryption': requireAuthenticatedEncryption,
  'no-key-reuse': noKeyReuse,
  'no-self-signed-certs': noSelfSignedCerts,
  'no-timing-unsafe-compare': noTimingUnsafeCompare,
  'require-key-length': requireKeyLength,
  'no-web-crypto-export': noWebCryptoExport,
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
  // Critical - Always error
  'crypto/no-weak-hash-algorithm': 'error',
  'crypto/no-weak-cipher-algorithm': 'error',
  'crypto/no-deprecated-cipher-method': 'error',
  'crypto/no-hardcoded-crypto-key': 'error',
  'crypto/no-ecb-mode': 'error',
  'crypto/no-cryptojs-weak-random': 'error',
  'crypto/no-math-random-crypto': 'error',
  'crypto/no-insecure-rsa-padding': 'error',
  'crypto/no-self-signed-certs': 'error',

  // High - Error for most projects
  'crypto/no-static-iv': 'error',
  'crypto/no-insecure-key-derivation': 'error',
  'crypto/require-random-iv': 'warn',
  'crypto/no-sha1-hash': 'error',
  'crypto/require-secure-pbkdf2-digest': 'error',
  'crypto/no-predictable-salt': 'error',
  'crypto/no-timing-unsafe-compare': 'warn',

  // Medium - Warnings
  'crypto/require-sufficient-length': 'warn',
  'crypto/no-numeric-only-tokens': 'warn',
  'crypto/no-cryptojs': 'warn',
  'crypto/prefer-native-crypto': 'warn',
  'crypto/require-authenticated-encryption': 'warn',
  'crypto/no-key-reuse': 'warn',
  'crypto/require-key-length': 'warn',
  'crypto/no-web-crypto-export': 'warn',
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

  /**
   * CryptoJS migration configuration
   * For teams migrating from crypto-js to native crypto
   */
  'cryptojs-migration': {
    plugins: {
      crypto: plugin,
    },
    rules: {
      'crypto/no-cryptojs': 'error',
      'crypto/no-cryptojs-weak-random': 'error',
      'crypto/prefer-native-crypto': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Node.js-only configuration
   * Only Node.js crypto rules, no package-specific rules
   */
  'nodejs-only': {
    plugins: {
      crypto: plugin,
    },
    rules: {
      'crypto/no-weak-hash-algorithm': 'error',
      'crypto/no-weak-cipher-algorithm': 'error',
      'crypto/no-deprecated-cipher-method': 'error',
      'crypto/no-static-iv': 'error',
      'crypto/no-ecb-mode': 'error',
      'crypto/no-insecure-key-derivation': 'error',
      'crypto/no-hardcoded-crypto-key': 'error',
      'crypto/require-random-iv': 'warn',
      'crypto/no-math-random-crypto': 'error',
      'crypto/no-insecure-rsa-padding': 'error',
      'crypto/require-secure-pbkdf2-digest': 'error',
      'crypto/no-predictable-salt': 'error',
      'crypto/require-authenticated-encryption': 'warn',
      'crypto/no-key-reuse': 'warn',
      'crypto/no-self-signed-certs': 'error',
      'crypto/no-timing-unsafe-compare': 'warn',
      'crypto/require-key-length': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * CVE-focused configuration
   * Rules specifically targeting known CVEs
   */
  'cve-focused': {
    plugins: {
      crypto: plugin,
    },
    rules: {
      'crypto/no-insecure-rsa-padding': 'error',     // CVE-2023-46809 (Marvin Attack)
      'crypto/no-cryptojs-weak-random': 'error',     // CVE-2020-36732
      'crypto/require-secure-pbkdf2-digest': 'error', // CVE-2023-46233
      'crypto/no-weak-hash-algorithm': 'error',      // Various CVEs
      'crypto/no-weak-cipher-algorithm': 'error',    // Various CVEs
    },
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
