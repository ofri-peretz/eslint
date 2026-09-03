/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cookie-auth-tokens
 * Detects storing bearer credentials in cookies via JavaScript (should be HttpOnly)
 * CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
 *
 * ## Rule partition
 *
 * **Owns:** a `document.cookie` write — bare, `window.document`-qualified or
 * computed — whose **cookie NAME** names a bearer credential by whole word
 * (`token`, `jwt`, `bearer`, `auth`, `session`, `sid`, `credential`). A cookie
 * a script can write is a cookie a script can read, so the credential is not
 * HttpOnly by construction.
 *
 * **Defers to:**
 * - `no-sensitive-cookie-js` — cookie names that denote a NON-bearer secret
 *   (`password`, `api key`, `ssn`, …). The two vocabularies are disjoint, so
 *   one realistic line produces exactly one report.
 * - `require-cookie-secure-attrs` — complementary, not duplicate: it reports the
 *   missing `Secure`/`SameSite` attribute on ANY cookie, including one this rule
 *   has already flagged. Different CWE (614/352 vs 1004), different remediation.
 * - `no-jwt-in-storage` — the same credential written to Web Storage.
 *
 * ## What was wrong before
 *
 * The auth vocabulary was matched with `/access/i.test(wholeCookieString)`, so
 * `document.cookie = 'lastAccessed=2026-01-01'` was a CWE-1004 finding, and so
 * was any cookie whose *value* happened to contain one of the words. The test is
 * now whole-word membership against the cookie NAME only.
 *
 * @see https://cwe.mitre.org/data/definitions/1004.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';

import {
  cookieNameFrom,
  isCookieDeletion,
  isDocumentCookieTarget,
  BEARER_CREDENTIAL_TERMS,
  namesBearerCredential,
  staticCookieText,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'authTokenInCookie';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;

  /**
   * Whole words that name a bearer credential. REPLACES the default
   * vocabulary (`BEARER_CREDENTIAL_TERMS`), which is what this rule reported on
   * before the list was configurable.
   */
  bearerPatterns?: string[];
}

type RuleOptions = [Options?];

export const noCookieAuthTokens = createRule<RuleOptions, MessageIds>({
  name: 'no-cookie-auth-tokens',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-cookie-auth-tokens.md',
      description: 'Disallow storing auth tokens in cookies via JavaScript',
      cwe: 'CWE-1004',
      cvss: 8.5,
    },
    messages: {
      authTokenInCookie: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Auth Token in JS-Accessible Cookie',
        cwe: 'CWE-1004',
        owasp: 'A02:2021',
        cvss: 8.5,
        description:
          'Setting the "{{key}}" cookie from JavaScript means it is not HttpOnly, so any XSS can read the credential and replay it.',
        severity: 'HIGH',
        fix: 'Set auth cookies from the server with the HttpOnly flag.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          bearerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [...BEARER_CREDENTIAL_TERMS],
            description:
              'Whole words that name a bearer credential. Replaces the default vocabulary.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowInTests: true, bearerPatterns: [...BEARER_CREDENTIAL_TERMS] },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      bearerPatterns = BEARER_CREDENTIAL_TERMS,
    } = options as Options;
    const isTestFile = isTestFilePath(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!isDocumentCookieTarget(node.left)) return;

        const text = staticCookieText(node.right, context.sourceCode);
        // `document.cookie = 'sid=; Max-Age=0'` is a logout, not a leak.
        if (text === null || isCookieDeletion(text)) return;

        const name = cookieNameFrom(text);
        if (name === null || !namesBearerCredential(name, bearerPatterns)) {
          return;
        }

        context.report({
          node,
          messageId: 'authTokenInCookie',
          data: { key: name },
        });
      },
    };
  },
});
