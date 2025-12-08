/**
 * ESLint Rule: no-string-refs
 * Disallow string refs (deprecated pattern)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noStringRefs';

export const noStringRefs = createRule<[], MessageIds>({
  name: 'no-string-refs',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow string refs',
    },
    messages: {
      noStringRefs: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'String Refs',
        description: 'Usage of string refs detected',
        severity: 'HIGH',
        fix: 'Use callback refs: ref={(el) => this.myRef = el} or createRef: this.myRef = React.createRef()',
        documentationLink: 'https://react.dev/reference/react/forwardRef',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'ref'
        ) {
          // Check for direct string literals
          if (
            node.value &&
            node.value.type === 'Literal' &&
            typeof node.value.value === 'string'
          ) {
            context.report({
              node: node.name,
              messageId: 'noStringRefs',
            });
          }
          // Check for string literals inside JSX expressions
          else if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'Literal' &&
            typeof node.value.expression.value === 'string'
          ) {
            context.report({
              node: node.name,
              messageId: 'noStringRefs',
            });
          }
          // Check for template literals
          else if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'TemplateLiteral'
          ) {
            context.report({
              node: node.name,
              messageId: 'noStringRefs',
            });
          }
        }
      },
    };
  },
});
