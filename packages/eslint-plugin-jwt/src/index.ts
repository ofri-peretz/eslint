/**
 * eslint-plugin-jwt
 *
 * Comprehensive JWT security ESLint plugin for Node.js applications.
 * Detects vulnerabilities across jsonwebtoken, jose, express-jwt,
 * @nestjs/jwt, jwks-rsa, and jwt-decode libraries.
 *
 * Features:
 * - Algorithm confusion attack detection (CVE-2022-23540)
 * - "Back to the Future" replay attack prevention (LightSEC 2025)
 * - Signature verification enforcement
 * - Weak secret detection
 * - Expiration and claim validation
 * - AI-assisted fix guidance with CWE references
 *
 * @see https://tools.ietf.org/html/rfc8725
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 */
import type { TSESLint } from '@interlace/eslint-devkit';

// Import rules - Core Security
import { noAlgorithmNone } from './rules/no-algorithm-none';
import { noAlgorithmConfusion } from './rules/no-algorithm-confusion';
import { requireAlgorithmWhitelist } from './rules/require-algorithm-whitelist';
import { noDecodeWithoutVerify } from './rules/no-decode-without-verify';
import { noWeakSecret } from './rules/no-weak-secret';
import { requireExpiration } from './rules/require-expiration';
import { noHardcodedSecret } from './rules/no-hardcoded-secret';

// Import rules - 2025 Vulnerability Research
import { requireIssuedAt } from './rules/require-issued-at';
import { requireIssuerValidation } from './rules/require-issuer-validation';
import { requireAudienceValidation } from './rules/require-audience-validation';
import { noTimestampManipulation } from './rules/no-timestamp-manipulation';
import { requireMaxAge } from './rules/require-max-age';
import { noSensitivePayload } from './rules/no-sensitive-payload';

/**
 * Collection of all JWT security ESLint rules (13 rules)
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // Core Security Rules
  'no-algorithm-none': noAlgorithmNone,
  'no-algorithm-confusion': noAlgorithmConfusion,
  'require-algorithm-whitelist': requireAlgorithmWhitelist,
  'no-decode-without-verify': noDecodeWithoutVerify,
  'no-weak-secret': noWeakSecret,
  'require-expiration': requireExpiration,
  'no-hardcoded-secret': noHardcodedSecret,

  // 2025 Vulnerability Research - "Back to the Future" & Replay Prevention
  'require-issued-at': requireIssuedAt,
  'require-issuer-validation': requireIssuerValidation,
  'require-audience-validation': requireAudienceValidation,
  'no-timestamp-manipulation': noTimestampManipulation,
  'require-max-age': requireMaxAge,
  'no-sensitive-payload': noSensitivePayload,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-jwt',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended configuration - baseline security
 * Critical rules as errors, high as warnings
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // CRITICAL - Algorithm attacks
  'jwt/no-algorithm-none': 'error',
  'jwt/no-algorithm-confusion': 'error',

  // HIGH - Verification and secrets
  'jwt/require-algorithm-whitelist': 'warn',
  'jwt/no-decode-without-verify': 'warn',
  'jwt/no-weak-secret': 'error',
  'jwt/no-hardcoded-secret': 'error',
  'jwt/no-timestamp-manipulation': 'error', // LightSEC 2025

  // MEDIUM - Best practices
  'jwt/require-expiration': 'warn',
  'jwt/no-sensitive-payload': 'warn',
};

/**
 * Strict configuration - maximum security (2025 research)
 * All rules as errors - includes replay attack prevention
 */
const strictRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // All core rules as errors
  'jwt/no-algorithm-none': 'error',
  'jwt/no-algorithm-confusion': 'error',
  'jwt/require-algorithm-whitelist': 'error',
  'jwt/no-decode-without-verify': 'error',
  'jwt/no-weak-secret': 'error',
  'jwt/no-hardcoded-secret': 'error',
  'jwt/require-expiration': 'error',

  // 2025 Research - Full replay attack prevention
  'jwt/require-issued-at': 'error',
  'jwt/require-issuer-validation': 'error',
  'jwt/require-audience-validation': 'error',
  'jwt/no-timestamp-manipulation': 'error',
  'jwt/require-max-age': 'error',
  'jwt/no-sensitive-payload': 'error',
};

/**
 * Legacy configuration - migration mode
 * Only critical rules enabled
 */
const legacyRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Only most critical rules
  'jwt/no-algorithm-none': 'error',
  'jwt/no-algorithm-confusion': 'error',
  'jwt/no-hardcoded-secret': 'warn',
};

/**
 * Configuration presets for flat config
 */
export const configs = {
  /**
   * Recommended preset - balanced security
   */
  recommended: {
    plugins: {
      jwt: plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict preset - maximum security (includes 2025 research)
   */
  strict: {
    plugins: {
      jwt: plugin,
    },
    rules: strictRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Legacy preset - migration mode
   */
  legacy: {
    plugins: {
      jwt: plugin,
    },
    rules: legacyRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * All rules preset
   */
  all: {
    plugins: {
      jwt: plugin,
    },
    rules: strictRules,
  } satisfies TSESLint.FlatConfig.Config,
};

// Default export for flat config usage
export default plugin;

// Named exports for flexibility
export {
  noAlgorithmNone,
  noAlgorithmConfusion,
  requireAlgorithmWhitelist,
  noDecodeWithoutVerify,
  noWeakSecret,
  requireExpiration,
  noHardcodedSecret,
  requireIssuedAt,
  requireIssuerValidation,
  requireAudienceValidation,
  noTimestampManipulation,
  requireMaxAge,
  noSensitivePayload,
};
