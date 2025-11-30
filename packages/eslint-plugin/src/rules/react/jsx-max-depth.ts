/**
 * ESLint Rule: jsx-max-depth
 * Limit JSX nesting depth
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'jsxMaxDepth';

export interface Options {
  /** Maximum allowed depth of JSX nesting */
  max?: number;
}

type RuleOptions = [Options?];
export const jsxMaxDepth = createRule<RuleOptions, MessageIds>({
  name: 'jsx-max-depth',
  meta: {
    type: 'problem',
    docs: {
      description: 'Limit JSX nesting depth',
    },
    messages: {
      jsxMaxDepth: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Excessive JSX Depth',
        description: 'JSX nesting depth exceeds maximum',
        severity: 'MEDIUM',
        fix: 'Extract nested JSX into separate component or reduce nesting',
        documentationLink: 'https://react.dev/learn/thinking-in-react#step-4-identify-where-your-state-should-live',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: 5,
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ max: 5 }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const maxDepth = options?.max ?? 5;

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const depth = calculateDepth(node);
        if (depth > maxDepth) {
          context.report({
            node: node.openingElement.name,
            messageId: 'jsxMaxDepth',
          });
        }
      },
    };
  },
});

/**
 * Calculate the maximum depth of JSX nesting
 */
function calculateDepth(node: TSESTree.JSXElement, currentDepth = 0): number {
  let maxDepth = currentDepth;

  // Check children
  for (const child of node.children) {
    if (child.type === 'JSXElement') {
      const childDepth = calculateDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    } else if (child.type === 'JSXExpressionContainer') {
      // Check for JSX inside expressions
      const expression = child.expression;
      if (expression.type === 'JSXElement') {
        const childDepth = calculateDepth(expression, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
  }

  return maxDepth;
}
