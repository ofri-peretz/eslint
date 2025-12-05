/**
 * ESLint Rule: no-static-element-interactions
 * Enforce that static elements don't have interactive handlers
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-static-element-interactions.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noStaticInteraction';

type Options = {
  handlers?: string[];
};

type RuleOptions = [Options?];

const STATIC_ELEMENTS = new Set([
    'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
]);

const INTERACTIVE_HANDLERS = [
    'onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'
];

export const noStaticElementInteractions = createRule<RuleOptions, MessageIds>({
  name: 'no-static-element-interactions',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that static elements don\'t have interactive handlers',
    },
    messages: {
      noStaticInteraction: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Static Element Interaction',
        description: 'Avoid non-interactive elements with interactive handlers',
        severity: 'MEDIUM',
        fix: 'Add role="button" and tabIndex="0", or use a <button>',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-static-element-interactions.md',
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
        if (!STATIC_ELEMENTS.has(node.name.name)) return;

        const hasInteractiveHandler = node.attributes.some(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            handlers.includes(attr.name.name)
        );

        if (!hasInteractiveHandler) return;

        // Check if it has a role that makes it interactive
        const hasRole = node.attributes.some(attr => 
             attr.type === 'JSXAttribute' && 
             attr.name.type === 'JSXIdentifier' && 
             attr.name.name === 'role'
        );

        // Also check for hidden input type? No, this is static elements.
        
        if (!hasRole) {
             context.report({
                 node,
                 messageId: 'noStaticInteraction',
             });
        }
      },
    };
  },
});

