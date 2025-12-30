/**
 * Type exports for eslint-plugin-express-security
 */
import type { Options as RequireHelmetOptions } from '../rules/require-helmet';
import type { Options as NoPermissiveCorsOptions } from '../rules/no-permissive-cors';
import type { Options as RequireCsrfProtectionOptions } from '../rules/require-csrf-protection';
import type { Options as NoInsecureCookieOptions } from '../rules/no-insecure-cookie-options';
import type { Options as RequireRateLimitingOptions } from '../rules/require-rate-limiting';
import type { Options as NoGraphqlIntrospectionProductionOptions } from '../rules/no-graphql-introspection-production';
import type { Options as NoCorsCredentialsWildcardOptions } from '../rules/no-cors-credentials-wildcard';
import type { Options as RequireExpressBodyParserLimitsOptions } from '../rules/require-express-body-parser-limits';
import type { Options as NoExpressUnsafeRegexRouteOptions } from '../rules/no-express-unsafe-regex-route';

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
};

/**
 * Combined options type for all rules
 */
export interface AllExpressSecurityRulesOptions {
  'require-helmet'?: RequireHelmetOptions;
  'no-permissive-cors'?: NoPermissiveCorsOptions;
  'require-csrf-protection'?: RequireCsrfProtectionOptions;
  'no-insecure-cookie-options'?: NoInsecureCookieOptions;
  'require-rate-limiting'?: RequireRateLimitingOptions;
  'no-graphql-introspection-production'?: NoGraphqlIntrospectionProductionOptions;
  'no-cors-credentials-wildcard'?: NoCorsCredentialsWildcardOptions;
  'require-express-body-parser-limits'?: RequireExpressBodyParserLimitsOptions;
  'no-express-unsafe-regex-route'?: NoExpressUnsafeRegexRouteOptions;
}
