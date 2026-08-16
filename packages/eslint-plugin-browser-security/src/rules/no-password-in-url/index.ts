/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent passwords in URLs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/598.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * Every `http(s)://…` occurrence in a string, with its AUTHORITY isolated.
 *
 * The authority is everything between `//` and the first `/`, `?`, `#` or
 * whitespace. Isolating it is what makes the credential test honest: the
 * previous pattern was `/https?:\/\/[^:]+:[^@]+@/`, which had no idea where
 * the authority ended, so
 *
 * ```js
 * const url = 'https://example.com:8080/threads/a@b';
 * ```
 *
 * matched — `example.com` for the user, `8080/threads/a` for the password —
 * and a port plus an `@` anywhere later in the path was reported as
 * credentials in a URL at CVSS 6.5.
 */
const HTTP_URL = /https?:\/\/([^/?#\s'"`<>]*)/gi;

/** Does any URL in this string carry `user:password@` in its authority? */
function hasUserinfoPassword(value: string): boolean {
  for (const match of value.matchAll(HTTP_URL)) {
    const authority = match[1];
    const at = authority.lastIndexOf('@');
    if (at <= 0) continue;
    const userinfo = authority.slice(0, at);
    // A password is the part after the colon. `https://token@host` carries a
    // username only, which CWE-521 is not about.
    const colon = userinfo.indexOf(':');
    if (colon > 0 && colon < userinfo.length - 1) return true;
  }
  return false;
}

export const noPasswordInUrl = createRule<RuleOptions, MessageIds>({
  name: 'no-password-in-url',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-password-in-url.md',
      description: 'Prevent passwords in URLs',
      cwe: 'CWE-521',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-521',
        description: 'Prevent passwords in URLs detected - this is a security risk',
        severity: 'CRITICAL',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/521.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && hasUserinfoPassword(node.value)) {
          report(node);
        }
      },
};
  },
});
