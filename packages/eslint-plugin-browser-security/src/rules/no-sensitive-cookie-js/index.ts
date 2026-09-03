/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-cookie-js
 * Detects storing non-bearer secrets (passwords, keys, regulated identifiers)
 * in cookies via JavaScript
 * CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
 *
 * ## Rule partition
 *
 * **Owns:** a `document.cookie` write whose **cookie NAME** names a
 * **non-bearer** secret by whole word — `password`, `secret`, `api key`,
 * `private key`, `ssn`, `credit card`, `cvv`, `seed phrase`, …
 *
 * **Defers to:**
 * - `no-cookie-auth-tokens` — bearer credentials (`token`, `jwt`, `bearer`,
 *   `auth`, `session`, `sid`, `credential`). Structural: the bearer check runs
 *   first and returns, before the user's `sensitivePatterns` are consulted, so
 *   configuring `'token'` here cannot resurrect the double report.
 *   `document.cookie = 'access_token=abc; Secure; SameSite=Strict'` used to
 *   produce two reports at CVSS 8.5 and 8.1 for one defect; it now produces one.
 * - `require-cookie-secure-attrs` — complementary (missing attribute, CWE-614/352).
 *
 * ## What was wrong before
 *
 * `extractCookieKey` was applied to `value.left` of a `BinaryExpression`, which
 * is itself a `BinaryExpression` as soon as there are three terms — so the most
 * common real spelling was a false negative:
 *
 * ```js
 * document.cookie = 'api_key=' + key + '; Path=/';   // silent
 * ```
 *
 * @see https://cwe.mitre.org/data/definitions/1004.html
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';

import {
  cookieNameFrom,
  isCookieDeletion,
  isDocumentCookieTarget,
  namesBearerCredential,
  namesNonBearerSecret,
  NON_BEARER_SECRET_TERMS,
  staticCookieText,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'sensitiveCookieJs';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Whole-word terms to treat as sensitive. REPLACES the default vocabulary. */
  sensitivePatterns?: string[];
}

type RuleOptions = [Options?];

export const noSensitiveCookieJs = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-cookie-js',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-cookie-js.md',
      description:
        'Disallow storing sensitive data (passwords, keys, regulated identifiers) in cookies via JavaScript',
      cwe: 'CWE-1004',
      cvss: 8.1,
    },
    messages: {
      sensitiveCookieJs: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Cookie via JavaScript',
        cwe: 'CWE-1004',
        owasp: 'A02:2021',
        cvss: 8.1,
        description:
          'Setting "{{key}}" cookie via document.cookie makes it accessible to XSS attacks. Sensitive cookies should be set server-side with HttpOnly flag.',
        severity: 'HIGH',
        fix: 'Set the value server-side with HttpOnly, Secure and SameSite flags — or do not put it in a cookie at all.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [...NON_BEARER_SECRET_TERMS],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      sensitivePatterns: [...NON_BEARER_SECRET_TERMS],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, sensitivePatterns = [...NON_BEARER_SECRET_TERMS] } = options as Options;
    const isTestFile = isTestFilePath(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!isDocumentCookieTarget(node.left)) return;

        const text = staticCookieText(node.right, context.sourceCode);
        // `document.cookie = 'api_key=; Max-Age=0'` is a clear-down, not a leak.
        if (text === null || isCookieDeletion(text)) return;

        const name = cookieNameFrom(text);
        if (name === null) return;

        // Structural deferral to no-cookie-auth-tokens, before user patterns.
        if (namesBearerCredential(name)) return;
        if (!namesNonBearerSecret(name, sensitivePatterns)) return;

        context.report({
          node,
          messageId: 'sensitiveCookieJs',
          data: { key: name },
        });
      },
    };
  },
});
