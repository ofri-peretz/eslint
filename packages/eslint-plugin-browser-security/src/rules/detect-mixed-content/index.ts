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

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isXmlNamespaceUri,
  isTrustworthyLocalUrl,
  isDiscardedUrlBase,
} from '../../utils/namespace-uris';
import type { TSESTree } from '@interlace/eslint-devkit';

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
      
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string' || !node.value.startsWith('http://')) {
          return;
        }
        // `xmlns="http://www.w3.org/2000/svg"` is an identifier compared
        // byte-for-byte, never a request. It cannot be mixed content, and
        // rewriting it to https breaks the document.
        const parent = node.parent;
        const declaredAs =
          parent?.type === 'JSXAttribute' && parent.name.type === 'JSXIdentifier'
            ? parent.name.name
            : undefined;
        if (isXmlNamespaceUri(node.value, declaredAs)) {
          return;
        }
        // A loopback origin is potentially trustworthy per the Secure Contexts
        // spec, so no browser blocks or flags it from an HTTPS page. Calling it
        // mixed content describes behaviour that does not happen.
        if (isTrustworthyLocalUrl(node.value)) {
          return;
        }
        // A parsing base whose origin is destructured away is never fetched,
        // so it cannot be mixed content. Shared with `no-http-urls` so the two
        // rules cannot disagree about it.
        if (isDiscardedUrlBase(node)) {
          return;
        }
        context.report({ node, messageId: 'violationDetected' });
      },
    };
  },
});
