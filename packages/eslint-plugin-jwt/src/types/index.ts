/**
 * eslint-plugin-jwt Type Exports
 *
 * Barrel file that exports all JWT security rule Options types.
 */

import type { SecurityRuleOptions } from '@interlace/eslint-devkit';

// Base options interface for JWT rules
export interface JwtRuleOptions extends SecurityRuleOptions {
  /** JWT libraries to consider for detection. Default: all supported libraries */
  targetLibraries?: Array<
    | 'jsonwebtoken'
    | 'jose'
    | 'express-jwt'
    | '@nestjs/jwt'
    | 'jwks-rsa'
    | 'jwt-decode'
  >;
}

// Rule-specific options
export interface NoAlgorithmNoneOptions extends JwtRuleOptions {
  /** Allow 'none' algorithm in test files. Default: false */
  allowInTests?: boolean;
}

export interface NoAlgorithmConfusionOptions extends JwtRuleOptions {
  /** Symmetric algorithms that should not be used with public keys */
  symmetricAlgorithms?: string[];
}

export interface RequireAlgorithmWhitelistOptions extends JwtRuleOptions {
  /** Recommended algorithms to suggest. Default: ['RS256', 'ES256'] */
  recommendedAlgorithms?: string[];
}

export interface NoDecodeWithoutVerifyOptions extends JwtRuleOptions {
  /** Allow decode() for header inspection before verify. Default: false */
  allowHeaderInspection?: boolean;
}

export interface NoWeakSecretOptions extends JwtRuleOptions {
  /** Minimum secret length in characters. Default: 32 (256 bits) */
  minSecretLength?: number;
}

export interface RequireExpirationOptions extends JwtRuleOptions {
  /** Maximum allowed expiration time in seconds. Default: 86400 (24 hours) */
  maxExpirationSeconds?: number;
}

export interface RequireIssuerValidationOptions extends JwtRuleOptions {
  /** Known valid issuers to suggest. Default: [] */
  knownIssuers?: string[];
}

export interface RequireAudienceValidationOptions extends JwtRuleOptions {
  /** Known valid audiences to suggest. Default: [] */
  knownAudiences?: string[];
}

export interface NoSensitivePayloadOptions extends JwtRuleOptions {
  /** Additional field names to flag as sensitive. Default: [] */
  additionalSensitiveFields?: string[];
}

export interface NoHardcodedSecretOptions extends JwtRuleOptions {
  /** Patterns that indicate environment variable usage (safe). Default: process.env */
  envPatterns?: string[];
}

export interface RequireJwksValidationOptions extends JwtRuleOptions {
  /** Require cache configuration. Default: true */
  requireCache?: boolean;
  /** Require rate limiting. Default: true */
  requireRateLimit?: boolean;
}

export interface NoInsecureKidOptions extends JwtRuleOptions {
  /** Allow custom KID validation functions. Default: [] */
  trustedKidValidators?: string[];
}

/**
 * Combined type for all JWT rule options
 */
export type AllJwtRulesOptions = {
  'no-algorithm-none'?: NoAlgorithmNoneOptions;
  'no-algorithm-confusion'?: NoAlgorithmConfusionOptions;
  'require-algorithm-whitelist'?: RequireAlgorithmWhitelistOptions;
  'no-decode-without-verify'?: NoDecodeWithoutVerifyOptions;
  'no-weak-secret'?: NoWeakSecretOptions;
  'require-expiration'?: RequireExpirationOptions;
  'require-issuer-validation'?: RequireIssuerValidationOptions;
  'require-audience-validation'?: RequireAudienceValidationOptions;
  'no-sensitive-payload'?: NoSensitivePayloadOptions;
  'no-hardcoded-secret'?: NoHardcodedSecretOptions;
  'require-jwks-validation'?: RequireJwksValidationOptions;
  'no-insecure-kid'?: NoInsecureKidOptions;
};
