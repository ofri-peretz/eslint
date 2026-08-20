/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect HTTP resources in HTTPS pages
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

/**
 * ## Rule partition — cleartext transport (CWE-319 / CWE-311)
 *
 * **This rule owns the SUBRESOURCE position**: an `http://` URL written where
 * the browser loads it as a subresource of the document — `<img src>`,
 * `<script src>`, `<link href>`, `<iframe src>`, `<form action>`, `el.src =`,
 * `setAttribute('src', …)`, `importScripts(…)`. That is what mixed content
 * *is*, and it is the one thing in this family a browser will actually BLOCK.
 *
 * `<a href="http://…">` is deliberately NOT this rule's. A link is a
 * navigation; no browser blocks or warns on it, so calling it mixed content
 * describes behaviour that does not happen. Anchors stay with `no-http-urls`,
 * where "hardcoded cleartext URL" is the true and actionable statement.
 *
 * ### Why the predicate changed
 *
 * The predicate used to be "a string Literal starting with `http://`" — which
 * is every hardcoded HTTP URL in the program. Every finding was therefore a
 * second report of a line `no-http-urls` had already claimed, one line under
 * two CWEs at two severities, and the rule was demoted out of `recommended` on
 * 2026-08-13 for exactly that reason. Deleting the rule was never the fix: the
 * duplication came from the predicate not matching the rule's own name, and
 * `<img src="http://cdn…">` genuinely is a different, more severe fact than a
 * cleartext string in a config object. Narrowing the predicate to the thing the
 * rule is named for gives it territory no sibling covers, which is what makes
 * the demotion reversible — it is back in `recommended`, and `no-http-urls`
 * stands down on the shape so the preset still reports each line exactly once.
 *
 * Defers to `require-https-only` on a `fetch`/`axios` URL argument: a request
 * the code makes itself is not a document subresource.
 *
 * The boundary is `isSubresourcePosition` in `utils/transport-ownership.ts`,
 * called by both sides of the deferral rather than restated per rule.
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isTrustworthyLocalUrl } from '../../utils/namespace-uris';
import { isSubresourcePosition } from '../../utils/transport-ownership';
import type { TSESTree } from '@interlace/eslint-devkit';

/**
 * URL schemes are ASCII case-insensitive, so `HTTP://cdn/lib.js` loads exactly
 * like the lowercase form. The rule tested `startsWith('http://')`, which the
 * shift key defeats — a real false negative on legacy URLs, which are the ones
 * most likely to still be cleartext. Every sibling in the family already used
 * a case-insensitive test; this one did not.
 */
const CLEARTEXT_SCHEME = /^http:\/\//i;

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const detectMixedContent = createRule<RuleOptions, MessageIds>({
  name: 'detect-mixed-content',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/detect-mixed-content.md',
      description: 'Detect HTTP resources in HTTPS pages',
      cwe: 'CWE-311',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-311',
        description: 'Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/311.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      
      // A template literal in a subresource position is the same load with a
      // runtime path — `` <img src={`http://cdn.acme.io/${id}.png`} /> ``. It
      // is read here because `no-http-urls` declines a template whose authority
      // is interpolated, so without this the deferral would leave the shape
      // uncovered by every rule in the family.
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const cooked = node.quasis[0]?.value.cooked;
        if (
          cooked !== undefined &&
          CLEARTEXT_SCHEME.test(cooked) &&
          !isTrustworthyLocalUrl(cooked) &&
          isSubresourcePosition(node)
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },

      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string' || !CLEARTEXT_SCHEME.test(node.value)) {
          return;
        }
        // --- family partition -------------------------------------------------
        // Only a subresource load is mixed content. Everything else that spells
        // `http://` belongs to `no-http-urls` (the general cleartext URL) or to
        // `require-https-only` (a request this code makes).
        if (!isSubresourcePosition(node)) {
          return;
        }
        // A loopback origin is potentially trustworthy per the Secure Contexts
        // spec, so no browser blocks or flags it from an HTTPS page. Calling it
        // mixed content describes behaviour that does not happen — and
        // `<img src="http://localhost:3000/preview.png">` is ordinary dev code.
        if (isTrustworthyLocalUrl(node.value)) {
          return;
        }
        //
        // The `isXmlNamespaceUri` and `isDiscardedUrlBase` guards that used to
        // sit here are GONE, not relaxed. Both became unreachable when the
        // predicate narrowed to subresource positions: `xmlns` is not a
        // subresource attribute on any element, and `new URL(p, 'http://…')`
        // is a constructor argument, never a load. They are still applied by
        // `no-http-urls`, which is the rule those shapes now belong to.
        // Keeping them here would have been two branches no test could reach,
        // in a package held to 100% coverage.
        context.report({ node, messageId: 'violationDetected' });
      },
    };
  },
});
