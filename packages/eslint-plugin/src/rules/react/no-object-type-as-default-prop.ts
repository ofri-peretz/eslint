/**
 * ESLint Rule: no-object-type-as-default-prop
 * Prevent object types as default props
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noObjectTypeAsDefaultProp';

export const noObjectTypeAsDefaultProp = createRule<[], MessageIds>({
  name: 'no-object-type-as-default-prop',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent object types as default props',
    },
    messages: {
      noObjectTypeAsDefaultProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Object as Default Prop',
        description: 'Object used as default prop value',
        severity: 'MEDIUM',
        fix: 'Create object outside component or use factory function',
        documentationLink: 'https://react.dev/learn/passing-props-to-a-component#default-props',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Check defaultProps assignments (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="defaultProps"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          for (const prop of node.value.properties) {
            if (prop.type === 'Property' && prop.value.type === 'ObjectExpression') {
              context.report({
                node: prop.key,
                messageId: 'noObjectTypeAsDefaultProp',
              });
            }
          }
        }
      },

      // Check default parameter assignments in function components
      AssignmentPattern(node: TSESTree.AssignmentPattern) {
        if (node.right.type === 'ObjectExpression') {
          // Check if this is a destructured parameter in a function component
          if (node.parent.type === 'Property' || node.parent.type === 'RestElement') {
            // This is likely a function parameter with default value
            context.report({
              node: node.left,
              messageId: 'noObjectTypeAsDefaultProp',
            });
          }
        }
      },
    };
  },
});
