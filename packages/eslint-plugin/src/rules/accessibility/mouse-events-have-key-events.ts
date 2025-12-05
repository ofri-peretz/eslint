/**
 * ESLint Rule: mouse-events-have-key-events
 * Enforce that onMouseOver/onMouseOut are accompanied by onFocus/onBlur for keyboard accessibility
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingOnFocus' | 'missingOnBlur';

type RuleOptions = [];

export const mouseEventsHaveKeyEvents = createRule<RuleOptions, MessageIds>({
  name: 'mouse-events-have-key-events',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that onMouseOver/onMouseOut are accompanied by onFocus/onBlur',
    },
    messages: {
      missingOnFocus: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Handler',
        description: 'onMouseOver must be accompanied by onFocus for keyboard accessibility',
        severity: 'MEDIUM',
        fix: 'Add onFocus handler',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md',
      }),
      missingOnBlur: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Handler',
        description: 'onMouseOut must be accompanied by onBlur for keyboard accessibility',
        severity: 'MEDIUM',
        fix: 'Add onBlur handler',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const attributes = node.attributes.filter((attr): attr is TSESTree.JSXAttribute => 
          attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier'
        );

        const hasMouseOver = attributes.some(attr => attr.name.name === 'onMouseOver');
        const hasMouseOut = attributes.some(attr => attr.name.name === 'onMouseOut');
        const hasFocus = attributes.some(attr => attr.name.name === 'onFocus');
        const hasBlur = attributes.some(attr => attr.name.name === 'onBlur');

        if (hasMouseOver && !hasFocus) {
          context.report({
            node,
            messageId: 'missingOnFocus',
          });
        }

        if (hasMouseOut && !hasBlur) {
          context.report({
            node,
            messageId: 'missingOnBlur',
          });
        }
      },
    };
  },
});

