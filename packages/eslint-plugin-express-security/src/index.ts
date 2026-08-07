/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
import { noExposedDebugEndpoints } from './rules/no-exposed-debug-endpoints';

// Migrated from browser-security — these check server-side Express patterns, not browser APIs
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noMissingCsrfProtection } from './rules/no-missing-csrf-protection';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';

// Structural redirect safety — structural-api, enforcement-grade
import { noUserControlledRedirect } from './rules/no-user-controlled-redirect';

// Corpus coverage-gap rules (A-lite, 2026-07) — CWE-640/209/598/073/548/178/843
import { noHostHeaderInLinks } from './rules/no-host-header-in-links';
import { noErrorDetailsInResponse } from './rules/no-error-details-in-response';
import { noSensitiveDataInQuery } from './rules/no-sensitive-data-in-query';
import { noUserControlledRenderLocals } from './rules/no-user-controlled-render-locals';
import { noStaticRootExposure } from './rules/no-static-root-exposure';
import { requireCaseInsensitivePathGuard } from './rules/require-case-insensitive-path-guard';
import { requireQueryTypeGuard } from './rules/require-query-type-guard';

// Helmet header family (F#26 Express-depth gap) — CWE-693/319/79/348
import { noDisabledHelmetProtections } from './rules/no-disabled-helmet-protections';
import { requireStrictTransportSecurity } from './rules/require-strict-transport-security';
import { noUnsafeCspDirectives } from './rules/no-unsafe-csp-directives';
import { noPermissiveTrustProxy } from './rules/no-permissive-trust-proxy';

// CWE Top 25 (2025) access-control adjacency — CWE-306/863/639
import { requireRouteAuthentication } from './rules/require-route-authentication';
import { noClientControlledAuthorization } from './rules/no-client-controlled-authorization';
import { noIdorResourceAccess } from './rules/no-idor-resource-access';

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
  'no-exposed-debug-endpoints': noExposedDebugEndpoints,

  // Migrated from browser-security (server-side Express checks)
  'no-missing-cors-check': noMissingCorsCheck,
  'no-missing-csrf-protection': noMissingCsrfProtection,
  'no-missing-security-headers': noMissingSecurityHeaders,

  // Open redirect — structural-api (fires on res.redirect(req.query.*) AST shape)
  'no-user-controlled-redirect': noUserControlledRedirect,

  // Corpus coverage-gap rules (A-lite, 2026-07)
  'no-host-header-in-links': noHostHeaderInLinks,
  'no-error-details-in-response': noErrorDetailsInResponse,
  'no-sensitive-data-in-query': noSensitiveDataInQuery,
  'no-user-controlled-render-locals': noUserControlledRenderLocals,
  'no-static-root-exposure': noStaticRootExposure,
  'require-case-insensitive-path-guard': requireCaseInsensitivePathGuard,
  'require-query-type-guard': requireQueryTypeGuard,

  // Helmet header family (F#26 Express-depth gap)
  'no-disabled-helmet-protections': noDisabledHelmetProtections,
  'require-strict-transport-security': requireStrictTransportSecurity,
  'no-unsafe-csp-directives': noUnsafeCspDirectives,
  'no-permissive-trust-proxy': noPermissiveTrustProxy,

  // CWE Top 25 (2025) access-control adjacency
  'require-route-authentication': requireRouteAuthentication,
  'no-client-controlled-authorization': noClientControlledAuthorization,
  'no-idor-resource-access': noIdorResourceAccess,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-express-security',
    version: '1.5.5',
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
  'express-security/no-exposed-debug-endpoints': 'error',

  // Migrated from browser-security
  'express-security/no-missing-cors-check': 'warn',
  'express-security/no-missing-csrf-protection': 'warn',
  'express-security/no-missing-security-headers': 'warn',

  // Open redirect — structural, CWE-601
  'express-security/no-user-controlled-redirect': 'error',

  // Corpus coverage-gap rules (A-lite, 2026-07)
  'express-security/no-host-header-in-links': 'error',
  'express-security/no-error-details-in-response': 'error',
  // Name-based detection (sensitive param names) — review-prompt severity per scope audit I3
  'express-security/no-sensitive-data-in-query': 'warn',
  'express-security/no-user-controlled-render-locals': 'error',
  'express-security/no-static-root-exposure': 'error',
  'express-security/require-case-insensitive-path-guard': 'warn',
  'express-security/require-query-type-guard': 'warn',

  // Helmet header family — structural helmet-option shapes, enforcement-grade
  'express-security/no-disabled-helmet-protections': 'error',
  'express-security/require-strict-transport-security': 'error',
  'express-security/no-unsafe-csp-directives': 'error',
  'express-security/no-permissive-trust-proxy': 'error',

  // Access control — path/property vocabularies drive detection, so these
  // ship as review-prompt severity per scope audit I3 (naming-heuristic).
  'express-security/require-route-authentication': 'warn',
  'express-security/no-client-controlled-authorization': 'warn',
  'express-security/no-idor-resource-access': 'warn',
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
      ]),
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
      'express-security/no-disabled-helmet-protections': 'error',
      'express-security/require-strict-transport-security': 'error',
      'express-security/no-unsafe-csp-directives': 'error',
      'express-security/no-permissive-trust-proxy': 'error',
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
