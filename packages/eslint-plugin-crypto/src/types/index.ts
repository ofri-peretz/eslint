/**
 * Type definitions for eslint-plugin-crypto rules
 */

// Core Node.js Crypto Rules
export interface NoWeakHashAlgorithmOptions {
  /** Additional weak algorithms to detect. Default: [] */
  additionalWeakAlgorithms?: string[];
  /** Allow weak crypto in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoWeakCipherAlgorithmOptions {
  /** Additional weak ciphers to detect. Default: [] */
  additionalWeakCiphers?: string[];
  /** Allow weak ciphers in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoDeprecatedCipherMethodOptions {
  /** Allow deprecated methods in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoStaticIvOptions {
  /** Allow static IVs in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoInsecureKeyDerivationOptions {
  /** Minimum PBKDF2 iterations. Default: 100000 */
  minIterations?: number;
}

export interface NoHardcodedCryptoKeyOptions {
  /** Allow hardcoded keys in test files. Default: false */
  allowInTests?: boolean;
}

export interface RequireRandomIvOptions {
  /** Allowed randomness sources. Default: ['randomBytes', 'getRandomValues'] */
  allowedSources?: string[];
}

export interface NoEcbModeOptions {
  /** Allow ECB in test files. Default: false */
  allowInTests?: boolean;
}

// Package-Specific Rules
export interface NoSha1HashOptions {
  /** Allow SHA1 in test files. Default: false */
  allowInTests?: boolean;
}

export interface RequireSufficientLengthOptions {
  /** Minimum token length. Default: 32 */
  minLength?: number;
}

export interface NoNumericOnlyTokensOptions {
  /** Allow numeric tokens for specific contexts. Default: [] */
  allowedContexts?: string[];
}

export interface NoCryptojsOptions {
  /** Severity level. Default: 'warn' */
  severity?: 'error' | 'warn';
}

export interface NoCryptojsWeakRandomOptions {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

export interface PreferNativeCryptoOptions {
  /** Severity level. Default: 'warn' */
  severity?: 'error' | 'warn';
}

// NEW: Advanced Security Rules
export interface NoMathRandomCryptoOptions {
  /** Allow Math.random() in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoInsecureRsaPaddingOptions {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

export interface RequireSecurePbkdf2DigestOptions {
  /** Allowed digest algorithms. Default: ['sha256', 'sha384', 'sha512'] */
  allowedDigests?: string[];
}

export interface NoPredictableSaltOptions {
  /** Minimum salt length in bytes. Default: 16 */
  minSaltLength?: number;
}

export interface RequireAuthenticatedEncryptionOptions {
  /** Allow unauthenticated modes in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoKeyReuseOptions {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoSelfSignedCertsOptions {
  /** Allow in test/development files. Default: false */
  allowInTests?: boolean;
}

export interface NoTimingUnsafeCompareOptions {
  /** Variable name patterns that indicate secrets. Default: ['token', 'secret', 'key', ...] */
  secretPatterns?: string[];
}

export interface RequireKeyLengthOptions {
  /** Minimum AES key bits. Default: 256 */
  minKeyBits?: number;
}

export interface NoWebCryptoExportOptions {
  /** Allow key export in test files. Default: false */
  allowInTests?: boolean;
}

/**
 * Combined type for all rule options
 */
export type AllCryptoRulesOptions = {
  // Core rules
  'no-weak-hash-algorithm': NoWeakHashAlgorithmOptions;
  'no-weak-cipher-algorithm': NoWeakCipherAlgorithmOptions;
  'no-deprecated-cipher-method': NoDeprecatedCipherMethodOptions;
  'no-static-iv': NoStaticIvOptions;
  'no-insecure-key-derivation': NoInsecureKeyDerivationOptions;
  'no-hardcoded-crypto-key': NoHardcodedCryptoKeyOptions;
  'require-random-iv': RequireRandomIvOptions;
  'no-ecb-mode': NoEcbModeOptions;
  // Package rules
  'no-sha1-hash': NoSha1HashOptions;
  'require-sufficient-length': RequireSufficientLengthOptions;
  'no-numeric-only-tokens': NoNumericOnlyTokensOptions;
  'no-cryptojs': NoCryptojsOptions;
  'no-cryptojs-weak-random': NoCryptojsWeakRandomOptions;
  'prefer-native-crypto': PreferNativeCryptoOptions;
  // Advanced rules
  'no-math-random-crypto': NoMathRandomCryptoOptions;
  'no-insecure-rsa-padding': NoInsecureRsaPaddingOptions;
  'require-secure-pbkdf2-digest': RequireSecurePbkdf2DigestOptions;
  'no-predictable-salt': NoPredictableSaltOptions;
  'require-authenticated-encryption': RequireAuthenticatedEncryptionOptions;
  'no-key-reuse': NoKeyReuseOptions;
  'no-self-signed-certs': NoSelfSignedCertsOptions;
  'no-timing-unsafe-compare': NoTimingUnsafeCompareOptions;
  'require-key-length': RequireKeyLengthOptions;
  'no-web-crypto-export': NoWebCryptoExportOptions;
};
