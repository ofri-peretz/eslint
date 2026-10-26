/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-did-update-set-state
 * Prevent setState in componentDidUpdate
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noDidUpdateSetState';

export interface Options {
  /** Allow setState in callback functions */
  allowInCallback?: boolean;
}

type RuleOptions = [Options?];

export const noDidUpdateSetState = createRule<RuleOptions, MessageIds>({
  name: 'no-did-update-set-state',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/no-did-update-set-state',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-did-update-set-state.md',
      description: 'Prevent setState in componentDidUpdate',
    },
    messages: {
      noDidUpdateSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'setState in componentDidUpdate',
        description: 'setState called in componentDidUpdate without condition',
        severity: 'HIGH',
        fix: 'Add condition to prevent infinite re-render loop',
        documentationLink:
          'https://react.dev/reference/react/Component#componentdidupdate',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInCallback: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInCallback: false }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let options: Options | undefined;
    let inComponentDidUpdate: boolean;
    let hasConditionalCheck: boolean;

    return {
      before() {
        [options] = context.options;
        inComponentDidUpdate = false;
        hasConditionalCheck = false;
      },
      'MethodDefinition[key.name="componentDidUpdate"]'(
        _node: TSESTree.MethodDefinition,
      ) {
        inComponentDidUpdate = true;
        hasConditionalCheck = false;
      },

      'MethodDefinition[key.name="componentDidUpdate"]:exit'(
        _node: TSESTree.MethodDefinition,
      ) {
        inComponentDidUpdate = false;
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      IfStatement(node: TSESTree.IfStatement) {
        if (inComponentDidUpdate) {
          hasConditionalCheck = true;
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!inComponentDidUpdate) return;

        // Check if this is a setState call
        if (
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'setState'
        ) {
          // Allow if there's a conditional check or callback is allowed
          if (!hasConditionalCheck && !options?.allowInCallback) {
            context.report({
              node: node.callee.property,
              messageId: 'noDidUpdateSetState',
            });
          }
        }
      },
    };
  },
});
