/**
 * eslint-plugin-express-security
 *
 * A comprehensive security-focused ESLint plugin for Express.js applications
 * with rules for detecting and preventing security vulnerabilities.
 *
 * Features:
 * - LLM-optimized error messages with CWE references
 * - OWASP Top 10 coverage
 * - Express-specific security patterns
 * - Framework-aware middleware detection
 *
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import { TSESLint } from '@interlace/eslint-devkit';

// Security rules - Headers & CORS
import { requireHelmet } from './rules/require-helmet';
import { noPermissiveCors } from './rules/no-permissive-cors';

// Security rules - CSRF & Cookies
import { requireCsrfProtection } from './rules/require-csrf-protection';
import { noInsecureCookieOptions } from './rules/no-insecure-cookie-options';

// Security rules - Rate Limiting
import { requireRateLimiting } from './rules/require-rate-limiting';

// Security rules - GraphQL
import { noGraphqlIntrospectionProduction } from './rules/no-graphql-introspection-production';

// Security rules - Critical CORS & DoS
import { noCorsCredentialsWildcard } from './rules/no-cors-credentials-wildcard';
import { requireExpressBodyParserLimits } from './rules/require-express-body-parser-limits';
import { noExpressUnsafeRegexRoute } from './rules/no-express-unsafe-regex-route';

/**
 * Collection of all Express security ESLint rules
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // Headers & CORS
  'require-helmet': requireHelmet,
  'no-permissive-cors': noPermissiveCors,

  // CSRF & Cookies
  'require-csrf-protection': requireCsrfProtection,
  'no-insecure-cookie-options': noInsecureCookieOptions,

  // Rate Limiting
  'require-rate-limiting': requireRateLimiting,

  // GraphQL
  'no-graphql-introspection-production': noGraphqlIntrospectionProduction,

  // Critical CORS & DoS (P0)
  'no-cors-credentials-wildcard': noCorsCredentialsWildcard,
  'require-express-body-parser-limits': requireExpressBodyParserLimits,
  'no-express-unsafe-regex-route': noExpressUnsafeRegexRoute,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-express-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended configuration - balanced security enforcement
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - Security Headers
  'express-security/require-helmet': 'error',
  'express-security/no-permissive-cors': 'error',

  // High - CSRF & Cookies
  'express-security/require-csrf-protection': 'warn',
  'express-security/no-insecure-cookie-options': 'error',

  // High - DDoS Protection
  'express-security/require-rate-limiting': 'warn',

  // Medium - GraphQL
  'express-security/no-graphql-introspection-production': 'warn',

  // Critical - CORS & DoS (P0)
  'express-security/no-cors-credentials-wildcard': 'error',
  'express-security/require-express-body-parser-limits': 'warn',
  'express-security/no-express-unsafe-regex-route': 'error',
};

/**
 * Preset configurations for Express security rules
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended security configuration
   *
   * Enables all security rules with sensible severity levels
   */
  recommended: {
    plugins: {
      'express-security': plugin,
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
      'express-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [
        `express-security/${ruleName}`,
        'error',
      ])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * API security configuration
   *
   * HTTP/API security rules only
   */
  api: {
    plugins: {
      'express-security': plugin,
    },
    rules: {
      'express-security/require-helmet': 'error',
      'express-security/no-permissive-cors': 'error',
      'express-security/require-csrf-protection': 'error',
      'express-security/no-insecure-cookie-options': 'error',
      'express-security/require-rate-limiting': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * GraphQL security configuration
   *
   * GraphQL-specific security rules only
   */
  graphql: {
    plugins: {
      'express-security': plugin,
    },
    rules: {
      'express-security/no-graphql-introspection-production': 'error',
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
  RequireHelmetOptions,
  NoPermissiveCorsOptions,
  RequireCsrfProtectionOptions,
  NoInsecureCookieOptions,
  RequireRateLimitingOptions,
  NoGraphqlIntrospectionProductionOptions,
  NoCorsCredentialsWildcardOptions,
  RequireExpressBodyParserLimitsOptions,
  NoExpressUnsafeRegexRouteOptions,
  AllExpressSecurityRulesOptions,
} from './types/index';
