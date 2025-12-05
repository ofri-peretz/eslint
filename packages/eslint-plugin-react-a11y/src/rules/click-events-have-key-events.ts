/**
 * ESLint Rule: click-events-have-key-events
 * Enforce that onClick is accompanied by keyboard events
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/click-events-have-key-events.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingKeyboardEvent';

type RuleOptions = [];

export const clickEventsHaveKeyEvents = createRule<RuleOptions, MessageIds>({
  name: 'click-events-have-key-events',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that onClick is accompanied by keyboard events',
    },
    messages: {
      missingKeyboardEvent: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Listener',
        description: 'onClick must be accompanied by onKeyUp, onKeyDown, or onKeyPress',
        severity: 'MEDIUM',
        fix: 'Add onKeyDown/onKeyUp handler',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/click-events-have-key-events.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const hasOnClick = node.attributes.some(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'onClick'
        );

        if (!hasOnClick) return;

        const hasKeyboardEvent = node.attributes.some(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            ['onKeyUp', 'onKeyDown', 'onKeyPress'].includes(attr.name.name)
        );

        // Exception: hidden inputs or non-interactive elements that shouldn't have click?
        // Actually, if it has click, it should have keyboard support.
        // But if it's a button or link, it's native.
        const tagName = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        const isInteractive = ['button', 'a', 'input', 'select', 'textarea', 'option'].includes(tagName || '');
        
        // Native interactive elements handle keyboard click automatically.
        // But if it's a div/span with onClick, it needs keyboard listener.
        if (isInteractive) return;

        if (!hasKeyboardEvent) {
          context.report({
            node,
            messageId: 'missingKeyboardEvent',
          });
        }
      },
    };
  },
});

