/**
 * ESLint Rule: no-noninteractive-element-interactions
 * Enforce that non-interactive elements don't have interactive handlers
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-interactions.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noInteraction';

type Options = {
  handlers?: string[];
};

type RuleOptions = [Options?];

const NON_INTERACTIVE_ELEMENTS = new Set([
    'main', 'area', 'article', 'aside', 'body', 'br', 'caption', 'dd', 'details', 'dialog', 'dl', 
    'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'header', 'hr', 'iframe', 'img', 'li', 'meter', 'nav', 'ol', 'output', 'p', 'pre', 'section', 
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'ul'
]);

const INTERACTIVE_HANDLERS = [
    'onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'
];

export const noNoninteractiveElementInteractions = createRule<RuleOptions, MessageIds>({
  name: 'no-noninteractive-element-interactions',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that non-interactive elements don\'t have interactive handlers',
    },
    messages: {
      noInteraction: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Non-interactive Interaction',
        description: 'Non-interactive element <{{element}}> should not have interactive handlers',
        severity: 'MEDIUM',
        fix: 'Use a more appropriate element or add a role',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-interactions.md',
      }),
    },
    schema: [
        {
            type: 'object',
            properties: {
                handlers: { type: 'array', items: { type: 'string' } }
            },
            additionalProperties: false
        }
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const handlers = (options && options.handlers) || INTERACTIVE_HANDLERS;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        const element = node.name.name;

        if (!NON_INTERACTIVE_ELEMENTS.has(element)) return;

        const hasInteractiveHandler = node.attributes.some(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            handlers.includes(attr.name.name)
        );

        if (!hasInteractiveHandler) return;

        // If it has a role, it might be valid (e.g., img role="button")
        const hasRole = node.attributes.some(attr => 
             attr.type === 'JSXAttribute' && 
             attr.name.type === 'JSXIdentifier' && 
             attr.name.name === 'role'
        );

        if (!hasRole) {
             context.report({
                 node,
                 messageId: 'noInteraction',
                 data: {
                     element
                 }
             });
        }
      },
    };
  },
});

