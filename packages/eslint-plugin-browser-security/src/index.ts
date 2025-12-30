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

// Storage Security
import { noSensitiveLocalstorage } from './rules/no-sensitive-localstorage';

// Cookie Security
import { noSensitiveCookieJs } from './rules/no-sensitive-cookie-js';

// WebSocket Security
import { requireWebsocketWss } from './rules/require-websocket-wss';

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

  // Storage Security
  'no-sensitive-localstorage': noSensitiveLocalstorage,

  // Cookie Security
  'no-sensitive-cookie-js': noSensitiveCookieJs,

  // WebSocket Security
  'require-websocket-wss': requireWebsocketWss,
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

  // High - Storage Security
  'browser-security/no-sensitive-localstorage': 'error',

  // High - Cookie Security
  'browser-security/no-sensitive-cookie-js': 'error',

  // High - WebSocket Security
  'browser-security/require-websocket-wss': 'error',
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
export type { Options as NoSensitiveLocalstorageOptions } from './rules/no-sensitive-localstorage';
export type { Options as NoSensitiveCookieJsOptions } from './rules/no-sensitive-cookie-js';
export type { Options as RequireWebsocketWssOptions } from './rules/require-websocket-wss';
