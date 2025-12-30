/**
 * eslint-plugin-browser-security
 *
 * Security-focused ESLint plugin for browser applications.
 * Detects XSS vulnerabilities, postMessage abuse, localStorage/sessionStorage/IndexedDB
 * token exposure, cookie security issues, WebSocket vulnerabilities, and more.
 *
 * Features:
 * - LLM-optimized error messages with CWE references
 * - XSS prevention rules (innerHTML, eval)
 * - postMessage security
 * - Storage security (localStorage, sessionStorage, IndexedDB)
 * - Cookie security
 * - WebSocket security
 * - Browser API security
 *
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import { TSESLint } from '@interlace/eslint-devkit';

// XSS Prevention Rules
import { noInnerhtml } from './rules/no-innerhtml';
import { noEval } from './rules/no-eval';

// postMessage Security
import { requirePostmessageOriginCheck } from './rules/require-postmessage-origin-check';
import { noPostmessageWildcardOrigin } from './rules/no-postmessage-wildcard-origin';
import { noPostmessageInnerhtml } from './rules/no-postmessage-innerhtml';

// Storage Security
import { noSensitiveLocalstorage } from './rules/no-sensitive-localstorage';
import { noJwtInStorage } from './rules/no-jwt-in-storage';
import { noSensitiveSessionstorage } from './rules/no-sensitive-sessionstorage';
import { noSensitiveIndexeddb } from './rules/no-sensitive-indexeddb';

// Cookie Security
import { noSensitiveCookieJs } from './rules/no-sensitive-cookie-js';
import { noCookieAuthTokens } from './rules/no-cookie-auth-tokens';
import { requireCookieSecureAttrs } from './rules/require-cookie-secure-attrs';

// WebSocket Security
import { requireWebsocketWss } from './rules/require-websocket-wss';
import { noWebsocketInnerhtml } from './rules/no-websocket-innerhtml';
import { noWebsocketEval } from './rules/no-websocket-eval';

// File API Security
import { noFilereaderInnerhtml } from './rules/no-filereader-innerhtml';
import { requireBlobUrlRevocation } from './rules/require-blob-url-revocation';

// Workers Security
import { noDynamicServiceWorkerUrl } from './rules/no-dynamic-service-worker-url';
import { noWorkerMessageInnerhtml } from './rules/no-worker-message-innerhtml';

// CSP Security
import { noUnsafeInlineCsp } from './rules/no-unsafe-inline-csp';
import { noUnsafeEvalCsp } from './rules/no-unsafe-eval-csp';

/**
 * Collection of all browser security ESLint rules
 */
export const rules: Record<
  string,
  TSESLint.RuleModule<string, readonly unknown[]>
> = {
  // XSS Prevention
  'no-innerhtml': noInnerhtml,
  'no-eval': noEval,

  // postMessage Security
  'require-postmessage-origin-check': requirePostmessageOriginCheck,
  'no-postmessage-wildcard-origin': noPostmessageWildcardOrigin,
  'no-postmessage-innerhtml': noPostmessageInnerhtml,

  // Storage Security
  'no-sensitive-localstorage': noSensitiveLocalstorage,
  'no-jwt-in-storage': noJwtInStorage,
  'no-sensitive-sessionstorage': noSensitiveSessionstorage,
  'no-sensitive-indexeddb': noSensitiveIndexeddb,

  // Cookie Security
  'no-sensitive-cookie-js': noSensitiveCookieJs,
  'no-cookie-auth-tokens': noCookieAuthTokens,
  'require-cookie-secure-attrs': requireCookieSecureAttrs,

  // WebSocket Security
  'require-websocket-wss': requireWebsocketWss,
  'no-websocket-innerhtml': noWebsocketInnerhtml,
  'no-websocket-eval': noWebsocketEval,

  // File API Security
  'no-filereader-innerhtml': noFilereaderInnerhtml,
  'require-blob-url-revocation': requireBlobUrlRevocation,

  // Workers Security
  'no-dynamic-service-worker-url': noDynamicServiceWorkerUrl,
  'no-worker-message-innerhtml': noWorkerMessageInnerhtml,

  // CSP Security
  'no-unsafe-inline-csp': noUnsafeInlineCsp,
  'no-unsafe-eval-csp': noUnsafeEvalCsp,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-browser-security',
    version: '0.0.1',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Recommended configuration - balanced security enforcement
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
  // Critical - XSS Prevention
  'browser-security/no-innerhtml': 'error',
  'browser-security/no-eval': 'error',

  // High - postMessage Security
  'browser-security/require-postmessage-origin-check': 'error',
  'browser-security/no-postmessage-wildcard-origin': 'error',
  'browser-security/no-postmessage-innerhtml': 'error',

  // High - Storage Security
  'browser-security/no-sensitive-localstorage': 'error',
  'browser-security/no-jwt-in-storage': 'error',
  'browser-security/no-sensitive-sessionstorage': 'error',
  'browser-security/no-sensitive-indexeddb': 'error',

  // High - Cookie Security
  'browser-security/no-sensitive-cookie-js': 'error',
  'browser-security/no-cookie-auth-tokens': 'error',
  'browser-security/require-cookie-secure-attrs': 'error',

  // High - WebSocket Security
  'browser-security/require-websocket-wss': 'error',
  'browser-security/no-websocket-innerhtml': 'error',
  'browser-security/no-websocket-eval': 'error',

  // High - File API Security
  'browser-security/no-filereader-innerhtml': 'error',
  'browser-security/require-blob-url-revocation': 'warn',

  // Medium - Workers Security
  'browser-security/no-dynamic-service-worker-url': 'error',
  'browser-security/no-worker-message-innerhtml': 'error',

  // Medium - CSP Security
  'browser-security/no-unsafe-inline-csp': 'error',
  'browser-security/no-unsafe-eval-csp': 'error',
};

/**
 * Preset configurations for browser security rules
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended security configuration
   */
  recommended: {
    plugins: {
      'browser-security': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict security configuration - all rules as errors
   */
  strict: {
    plugins: {
      'browser-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((ruleName) => [
        `browser-security/${ruleName}`,
        'error',
      ]),
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * XSS-focused configuration
   */
  xss: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/no-innerhtml': 'error',
      'browser-security/no-eval': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Storage security configuration
   */
  storage: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/no-sensitive-localstorage': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * postMessage security configuration
   */
  postmessage: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/require-postmessage-origin-check': 'error',
      'browser-security/no-postmessage-wildcard-origin': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * WebSocket security configuration
   */
  websocket: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/require-websocket-wss': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Cookie security configuration
   */
  cookies: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/no-sensitive-cookie-js': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

/**
 * Re-export types
 */
export type { Options as NoInnerhtmlOptions } from './rules/no-innerhtml';
export type { Options as NoEvalOptions } from './rules/no-eval';
export type { Options as RequirePostmessageOriginCheckOptions } from './rules/require-postmessage-origin-check';
export type { Options as NoPostmessageWildcardOriginOptions } from './rules/no-postmessage-wildcard-origin';
export type { Options as NoPostmessageInnerhtmlOptions } from './rules/no-postmessage-innerhtml';
export type { Options as NoSensitiveLocalstorageOptions } from './rules/no-sensitive-localstorage';
export type { Options as NoJwtInStorageOptions } from './rules/no-jwt-in-storage';
export type { Options as NoSensitiveSessionstorageOptions } from './rules/no-sensitive-sessionstorage';
export type { Options as NoSensitiveIndexeddbOptions } from './rules/no-sensitive-indexeddb';
export type { Options as NoSensitiveCookieJsOptions } from './rules/no-sensitive-cookie-js';
export type { Options as NoCookieAuthTokensOptions } from './rules/no-cookie-auth-tokens';
export type { Options as RequireCookieSecureAttrsOptions } from './rules/require-cookie-secure-attrs';
export type { Options as RequireWebsocketWssOptions } from './rules/require-websocket-wss';
export type { Options as NoWebsocketInnerhtmlOptions } from './rules/no-websocket-innerhtml';
export type { Options as NoWebsocketEvalOptions } from './rules/no-websocket-eval';
export type { Options as NoFilereaderInnerhtmlOptions } from './rules/no-filereader-innerhtml';
export type { Options as RequireBlobUrlRevocationOptions } from './rules/require-blob-url-revocation';
export type { Options as NoDynamicServiceWorkerUrlOptions } from './rules/no-dynamic-service-worker-url';
export type { Options as NoWorkerMessageInnerhtmlOptions } from './rules/no-worker-message-innerhtml';
export type { Options as NoUnsafeInlineCspOptions } from './rules/no-unsafe-inline-csp';
export type { Options as NoUnsafeEvalCspOptions } from './rules/no-unsafe-eval-csp';
