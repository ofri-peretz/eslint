/**
 * ESLint Rule: no-children-prop
 * Disallow passing children as props (dangerous pattern)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noChildrenProp';

export const noChildrenProp = createRule<[], MessageIds>({
  name: 'no-children-prop',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow passing children as props',
    },
    schema: [],
    messages: {
      noChildrenProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Children as Prop',
        description: 'Passing children as a prop',
        severity: 'HIGH',
        fix: 'Use JSX children syntax: <Component>children</Component>',
        documentationLink: 'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'children'
        ) {
          context.report({
            node: node.name,
            messageId: 'noChildrenProp',
          });
        }
      },

      // Check for children in spread attributes
      JSXSpreadAttribute(node: TSESTree.JSXSpreadAttribute) {
        if (
          node.argument.type === 'ObjectExpression'
        ) {
          // Check if the spread contains a children property
          for (const prop of node.argument.properties) {
            if (
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'children'
            ) {
              context.report({
                node: prop.key,
                messageId: 'noChildrenProp',
              });
            }
          }
        }
      },
    };
  },
});
