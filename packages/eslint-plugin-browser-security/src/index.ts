/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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

import { TSESLint, withCanonicalDocsUrls } from '@interlace/eslint-devkit';

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

// Migrated rules from secure-coding
import { detectMixedContent } from './rules/detect-mixed-content';
import { noAllowArbitraryLoads } from './rules/no-allow-arbitrary-loads';
import { noClickjacking } from './rules/no-clickjacking';
import { noCredentialsInQueryParams } from './rules/no-credentials-in-query-params';
import { noHttpUrls } from './rules/no-http-urls';
import { noIncompleteUrlSanitization } from './rules/no-incomplete-url-sanitization';
import { noInsecureRedirects } from './rules/no-insecure-redirects';
import { noInsecureWebsocket } from './rules/no-insecure-websocket';
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noMissingCsrfProtection } from './rules/no-missing-csrf-protection';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';
import { noPasswordInUrl } from './rules/no-password-in-url';
import { noPermissiveCors } from './rules/no-permissive-cors';
import { noSensitiveDataInAnalytics } from './rules/no-sensitive-data-in-analytics';
import { noSensitiveDataInCache } from './rules/no-sensitive-data-in-cache';
import { noTrackingWithoutConsent } from './rules/no-tracking-without-consent';
import { noUnencryptedTransmission } from './rules/no-unencrypted-transmission';
import { noUnescapedUrlParameter } from './rules/no-unescaped-url-parameter';
import { noUnvalidatedDeeplinks } from './rules/no-unvalidated-deeplinks';
import { requireCspHeaders } from './rules/require-csp-headers';
import { requireHttpsOnly } from './rules/require-https-only';
import { requireUrlValidation } from './rules/require-url-validation';
import { requireMimeTypeValidation } from './rules/require-mime-type-validation';
import { noDisabledCertificateValidation } from './rules/no-disabled-certificate-validation';

// Migrated from secure-coding (browser-specific auth)
import { noClientSideAuthLogic } from './rules/no-client-side-auth-logic';

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

  // Migrated rules
  'detect-mixed-content': detectMixedContent,
  'no-allow-arbitrary-loads': noAllowArbitraryLoads,
  'no-clickjacking': noClickjacking,
  'no-credentials-in-query-params': noCredentialsInQueryParams,
  'no-http-urls': noHttpUrls,
  'no-incomplete-url-sanitization': noIncompleteUrlSanitization,
  'no-insecure-redirects': noInsecureRedirects,
  'no-insecure-websocket': noInsecureWebsocket,
  'no-missing-cors-check': noMissingCorsCheck,
  'no-missing-csrf-protection': noMissingCsrfProtection,
  'no-missing-security-headers': noMissingSecurityHeaders,
  'no-password-in-url': noPasswordInUrl,
  'no-permissive-cors': noPermissiveCors,
  'no-sensitive-data-in-analytics': noSensitiveDataInAnalytics,
  'no-sensitive-data-in-cache': noSensitiveDataInCache,
  'no-tracking-without-consent': noTrackingWithoutConsent,
  'no-unencrypted-transmission': noUnencryptedTransmission,
  'no-unescaped-url-parameter': noUnescapedUrlParameter,
  'no-unvalidated-deeplinks': noUnvalidatedDeeplinks,
  'require-csp-headers': requireCspHeaders,
  'require-https-only': requireHttpsOnly,
  'require-url-validation': requireUrlValidation,
  'require-mime-type-validation': requireMimeTypeValidation,
  'no-disabled-certificate-validation': noDisabledCertificateValidation,

  // Migrated from secure-coding
  'no-client-side-auth-logic': noClientSideAuthLogic,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-browser-security', rules);

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-browser-security',
    version: '2.0.7',
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

  // Migrated Rules
  //
  // `detect-mixed-content` was removed from `recommended` on 2026-08-13 because
  // its entire predicate was "a string Literal starting with `http://`" — a
  // strict SUBSET of what `no-http-urls` already reported at `error`, under a
  // second CWE at a second severity. Every finding was a second report of a
  // line another rule had already claimed: one line, two severities, one
  // underlying fact.
  //
  // It is back, because the predicate was the bug rather than the rule. It now
  // reports only a SUBRESOURCE position — `<img src>`, `<script src>`,
  // `<link href>`, `<form action>`, `el.src =`, `setAttribute('src', …)`,
  // `importScripts(…)` — which is what mixed content actually means and the one
  // shape in this family a browser will BLOCK. `<a href="http://…">` is not it:
  // a link is a navigation, nothing blocks it, and it stays with
  // `no-http-urls`. `no-http-urls` stands down on the subresource shape via the
  // shared `isSubresourcePosition`, so the preset still reports each line
  // exactly once — and it now reports `` <img src={`http://cdn/${id}.png`} ``,
  // a template whose authority is interpolated, which NO rule caught before.
  //
  // See `utils/transport-ownership.ts` for the whole family partition.
  'browser-security/detect-mixed-content': 'error',
  //
  // `no-unencrypted-transmission` joins the preset for the same reason
  // `detect-mixed-content` could return: it no longer restates a sibling.
  //
  // It was kept out because its defaults included `http://` and `ws://`, which
  // made it a second (weaker) report on lines three other rules already owned.
  // Those schemes are gone from its defaults, so what it contributes now is the
  // NON-WEB cleartext protocols — `ftp:` `tcp:` `mongodb:` `redis:` `mysql:` —
  // and nothing else in this plugin detects them at all.
  //
  // That gap was measured, not assumed: with the preset as it stood,
  // `mongodb://user:pass@db.acme-corp.io:27017` drew ZERO findings. It is the
  // most severe shape in the family — the wire is cleartext AND the credential
  // is inline in the source — and it was the one nobody reported. See the
  // preset lock in `require-https-only/transport-partition.matrix.test.ts`,
  // which is what caught it.
  'browser-security/no-unencrypted-transmission': 'error',
  'browser-security/no-allow-arbitrary-loads': 'error',
  // `no-clickjacking` is DEPRECATED (meta.replacedBy -> eslint-plugin-express-security/
  // require-helmet) and must not ship in `recommended`: a preset that turns on a rule we are
  // telling people to stop using is a contradiction, and it was the only deprecated rule in
  // any of our recommended sets. Still exported, so an explicit enable keeps working until
  // the next major removes it.
  'browser-security/no-credentials-in-query-params': 'error',
  'browser-security/no-http-urls': 'error',
  'browser-security/no-incomplete-url-sanitization': 'error',
  'browser-security/no-insecure-redirects': 'error',
  'browser-security/no-disabled-certificate-validation': 'error',
  'browser-security/require-https-only': 'error',
  'browser-security/no-insecure-websocket': 'error',
  'browser-security/no-unvalidated-deeplinks': 'error',
  'browser-security/no-client-side-auth-logic': 'error',
};

/**
 * Preset configurations for browser security rules
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Flagship preset — the rule from this plugin in the ecosystem-wide
   * flagship list (`.agent/flagship-rules.md`). Narrow signature, no
   * legitimate use case for `postMessage(data, '*')` — high-signal CI gate.
   */
  flagship: {
    plugins: {
      'browser-security': plugin,
    },
    rules: {
      'browser-security/no-postmessage-wildcard-origin': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

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

