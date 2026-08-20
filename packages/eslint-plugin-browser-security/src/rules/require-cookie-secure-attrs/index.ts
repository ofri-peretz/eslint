/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-cookie-secure-attrs
 * Requires Secure and SameSite attributes when setting cookies
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 *
 * ## Rule partition
 *
 * **Owns:** the ATTRIBUTES of a `document.cookie` write — is `Secure` present,
 * is `SameSite` present. Independent of what the cookie holds; it fires on
 * `theme=dark` exactly as it fires on `sid=…`.
 *
 * **Complementary, not duplicate**, with `no-cookie-auth-tokens` and
 * `no-sensitive-cookie-js`: those two report *what* is in the cookie (a
 * credential a script can read, CWE-1004) and this one reports *how it travels*
 * (cleartext HTTP, CWE-614; cross-site, CWE-352). Both findings can be true of
 * one line and each needs a different edit, so the overlap is deliberate and is
 * excluded from the storage/cookie partition matrix.
 *
 * ## What was wrong before
 *
 * - Only `Literal` and `TemplateLiteral` right-hand sides were understood, so
 *   the commonest spelling in real code was silently unchecked:
 *   `document.cookie = 'sid=' + id + '; Secure; SameSite=Strict'` reported
 *   nothing — not even a false positive, just nothing. Concatenation is now
 *   folded to its static parts.
 * - Cookie DELETION (`document.cookie = 'sid=; Max-Age=0'`) was reported for
 *   missing attributes on a value that no longer exists.
 *
 * @see https://cwe.mitre.org/data/definitions/614.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';

import {
  cookieNameFrom,
  isCookieDeletion,
  isDocumentCookieTarget,
  staticCookieText,
} from '../../utils/sensitive-value-evidence';

type MessageIds = 'missingSecure' | 'missingSameSite';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireCookieSecureAttrs = createRule<RuleOptions, MessageIds>({
  name: 'require-cookie-secure-attrs',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-cookie-secure-attrs.md',
      description: 'Require Secure and SameSite attributes when setting cookies',
      cwe: 'CWE-614',
      cvss: 6.5,
    },
    messages: {
      missingSecure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cookie Missing Secure Attribute',
        cwe: 'CWE-614',
        owasp: 'A02:2021',
        cvss: 6.5,
        description:
          'Cookie set without Secure attribute. It will be sent over unencrypted HTTP connections.',
        severity: 'MEDIUM',
        fix: 'Add Secure attribute: document.cookie = "name=value; Secure; SameSite=Strict"',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies',
      }),
      missingSameSite: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cookie Missing SameSite Attribute',
        cwe: 'CWE-352',
        owasp: 'A01:2021',
        cvss: 6.5,
        description:
          'Cookie set without SameSite attribute. It may be vulnerable to CSRF attacks.',
        severity: 'MEDIUM',
        fix: 'Add SameSite attribute: document.cookie = "name=value; SameSite=Strict"',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const isTestFile = isTestFilePath(context.filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!isDocumentCookieTarget(node.left)) return;

        const cookieText = staticCookieText(node.right, context.sourceCode);

        // Nothing statically known — abstain rather than guess. A report here
        // would be about a string the rule has never seen.
        if (cookieText === null) return;

        // A statically-known cookie NAME is the minimum evidence that this is a
        // set rather than an arbitrary string. `name + '=' + value` tells us
        // nothing about what attributes the interpolations carry.
        if (cookieNameFrom(cookieText) === null) return;

        if (isCookieDeletion(cookieText)) return;

        if (!/;\s*secure\s*(?:;|$)/i.test(cookieText)) {
          context.report({ node, messageId: 'missingSecure' });
        }

        if (!/;\s*samesite\s*=/i.test(cookieText)) {
          context.report({ node, messageId: 'missingSameSite' });
        }
      },
    };
  },
});
