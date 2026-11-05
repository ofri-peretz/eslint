/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-code-point
 * Prefer codePointAt over charCodeAt for proper Unicode handling
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferCodePoint';

type RuleOptions = [];

export const preferCodePoint = createRule<RuleOptions, MessageIds>({
  name: 'prefer-code-point',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/prefer-code-point',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/prefer-code-point.md',
      description:
        'Prefer codePointAt over charCodeAt for proper Unicode character handling',
    },
    messages: {
      preferCodePoint: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Prefer codePointAt',
        description: 'Use codePointAt instead of charCodeAt for Unicode safety',
        severity: 'MEDIUM',
        fix: 'Replace charCodeAt() with codePointAt()',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-code-point.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // oxlint-disable-next-line consistent-function-scoping
    function isCharCodeAtCall(node: TSESTree.CallExpression): boolean {
      // Check if this is a call to charCodeAt method
      if (node.callee.type === 'MemberExpression') {
        // `obj.charCodeAt` and `obj['charCodeAt']` alike — `propertyName`
        // resolves both, so the separate computed-literal arm this replaces
        // was the same question asked twice. `obj[method]` names no static
        // property and is not reported. An optional call (`s?.charCodeAt(0)`)
        // splits astral characters just the same, so it is reported too.
        if (propertyName(node.callee) === 'charCodeAt') {
          return true;
        }
      }

      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isCharCodeAtCall(node)) {
          context.report({
            node,
            messageId: 'preferCodePoint',
            data: {
              current: 'charCodeAt()',
              fix: 'codePointAt()',
            },
          });
        }
      },
    };
  },
});
