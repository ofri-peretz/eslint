/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce URL validation before navigation
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isAttackerSteerableUrl } from '../../utils/url-taint';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireUrlValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-url-validation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-url-validation.md',
      description: 'Enforce URL validation before navigation',
      cwe: 'CWE-601',
      cvss: 6.1,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'URL Validation Required',
        cwe: 'CWE-601',
        description: 'Unvalidated URL used for navigation - this is a security risk',
        severity: 'HIGH',
        fix: 'Validate URLs before using them for navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/601.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * `<obj>.<name>` with a plain identifier base and no computed key.
     *
     * Kept deliberately shallow. `window.location.href = x` and
     * `location.assign(x)` belong to `no-insecure-redirects`; widening the base
     * here to any `Location` object would make both rules report the same line.
     */
    function isMember(
      node: TSESTree.Node,
      object: string,
      property: string,
    ): boolean {
      return (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.object.type === 'Identifier' &&
        node.object.name === object &&
        node.property.type === 'Identifier' &&
        node.property.name === property
      );
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // `window.location = x` and `location.href = x` are both whole-page
        // navigations. What decides the verdict is whether an attacker chose
        // the ORIGIN of `x` — not whether `x` happens to be spelled as a
        // variable. A hardcoded `const SUPPORT = 'https://help.example.com'`
        // is an Identifier and is not a redirect; `location.search` is a
        // MemberExpression and is the textbook one.
        if (
          isMember(node.left, 'window', 'location') ||
          isMember(node.left, 'location', 'href')
        ) {
          if (isAttackerSteerableUrl(node.right, sourceCode)) {
            report(node);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // `window.open(url)` opens the target in a new browsing context — same
        // open-redirect sink, same question about the argument.
        if (isMember(node.callee, 'window', 'open')) {
          const urlArg = node.arguments[0];
          if (urlArg && isAttackerSteerableUrl(urlArg, sourceCode)) {
            report(node);
          }
        }
      },
    };
  },
});
