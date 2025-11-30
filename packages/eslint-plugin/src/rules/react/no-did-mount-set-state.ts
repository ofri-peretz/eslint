/**
 * ESLint Rule: no-did-mount-set-state
 * Prevent setState in componentDidMount
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDidMountSetState';

export const noDidMountSetState = createRule<[], MessageIds>({
  name: 'no-did-mount-set-state',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent setState in componentDidMount',
    },
    schema: [],
    messages: {
      noDidMountSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'setState in componentDidMount',
        description: 'setState called in componentDidMount',
        severity: 'HIGH',
        fix: 'Use initial state or constructor instead',
        documentationLink: 'https://react.dev/reference/react/Component#componentdidmount',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    let inComponentDidMount = false;

    return {
      'MethodDefinition[key.name="componentDidMount"]'() {
        inComponentDidMount = true;
      },

      'MethodDefinition[key.name="componentDidMount"]:exit'() {
        inComponentDidMount = false;
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!inComponentDidMount) return;

        // Check if this is a setState call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'setState'
        ) {
          context.report({
            node: node.callee.property,
            messageId: 'noDidMountSetState',
          });
        }
      },
    };
  },
});
