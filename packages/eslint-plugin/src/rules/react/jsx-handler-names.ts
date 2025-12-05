/**
 * ESLint Rule: jsx-handler-names
 * Enforce event handler naming conventions
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'jsxHandlerNames';

export const jsxHandlerNames = createRule<[], MessageIds>({
  name: 'jsx-handler-names',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce event handler naming conventions',
    },
    schema: [],
    messages: {
      jsxHandlerNames: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Handler Name',
        description: 'Event handler does not follow naming convention',
        severity: 'LOW',
        fix: 'Rename handler to start with "handle" or "on" (e.g., handleClick, onSubmit)',
        documentationLink: 'https://react.dev/learn/responding-to-events#naming-event-handler-functions',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type === 'JSXIdentifier') {
          const attrName = node.name.name;

          // Check if this is an event handler (starts with 'on')
          if (attrName.startsWith('on') && attrName.length > 2) {
            // Check if the value is an identifier (function reference)
            if (node.value && node.value.type === 'JSXExpressionContainer') {
              const expression = node.value.expression;

              if (expression.type === 'Identifier') {
                const handlerName = expression.name;

                // Check naming convention: should start with 'handle' or 'on'
                if (!handlerName.startsWith('handle') && !handlerName.startsWith('on')) {
                  context.report({
                    node: expression,
                    messageId: 'jsxHandlerNames',
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});
