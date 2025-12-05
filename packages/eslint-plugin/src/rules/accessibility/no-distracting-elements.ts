/**
 * ESLint Rule: no-distracting-elements
 * Enforce that distracting elements are not used
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-distracting-elements.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDistractingElements';

type Options = {
  elements?: string[];
};

type RuleOptions = [Options?];

export const noDistractingElements = createRule<RuleOptions, MessageIds>({
  name: 'no-distracting-elements',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that distracting elements are not used',
    },
    messages: {
      noDistractingElements: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Distracting Element',
        description: '<{{element}}> elements are distracting and cause accessibility issues',
        severity: 'HIGH',
        fix: 'Remove the <{{element}}> element',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-distracting-elements.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          elements: {
            type: 'array',
            items: { type: 'string' },
            default: ['marquee', 'blink'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      elements: ['marquee', 'blink'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { elements = ['marquee', 'blink'] } = options || {};

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type === 'JSXIdentifier' && elements.includes(node.name.name)) {
          context.report({
            node,
            messageId: 'noDistractingElements',
            data: {
              element: node.name.name,
            },
          });
        }
      },
    };
  },
});

