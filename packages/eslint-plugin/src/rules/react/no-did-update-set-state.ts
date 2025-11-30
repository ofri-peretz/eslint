/**
 * ESLint Rule: no-did-update-set-state
 * Prevent setState in componentDidUpdate
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDidUpdateSetState';

export interface Options {
  /** Allow setState in callback functions */
  allowInCallback?: boolean;
}

export const noDidUpdateSetState = createRule<[Options], MessageIds>({
  name: 'no-did-update-set-state',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent setState in componentDidUpdate',
    },
    messages: {
      noDidUpdateSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'setState in componentDidUpdate',
        description: 'setState called in componentDidUpdate without condition',
        severity: 'HIGH',
        fix: 'Add condition to prevent infinite re-render loop',
        documentationLink: 'https://react.dev/reference/react/Component#componentdidupdate',
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
  create(context) {
    const [options] = context.options;
    let inComponentDidUpdate = false;
    let hasConditionalCheck = false;

    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'MethodDefinition[key.name="componentDidUpdate"]'(node: TSESTree.MethodDefinition) {
        inComponentDidUpdate = true;
        hasConditionalCheck = false;
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'MethodDefinition[key.name="componentDidUpdate"]:exit'(node: TSESTree.MethodDefinition) {
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
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'setState'
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
