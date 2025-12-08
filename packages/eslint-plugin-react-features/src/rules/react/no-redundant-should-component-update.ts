/**
 * ESLint Rule: no-redundant-should-component-update
 * Prevent redundant shouldComponentUpdate
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noRedundantShouldComponentUpdate';

export const noRedundantShouldComponentUpdate = createRule<[], MessageIds>({
  name: 'no-redundant-should-component-update',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent redundant shouldComponentUpdate',
    },
    messages: {
      noRedundantShouldComponentUpdate: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Redundant shouldComponentUpdate',
        description: 'shouldComponentUpdate method does nothing useful',
        severity: 'MEDIUM',
        fix: 'Remove redundant shouldComponentUpdate or implement proper logic',
        documentationLink: 'https://react.dev/reference/react/Component#shouldcomponentupdate',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'shouldComponentUpdate' &&
          node.value.type === 'FunctionExpression'
        ) {
          // Check if the method just returns true
          const body = node.value.body;
          if (body.type === 'BlockStatement' && body.body.length === 1) {
            const statement = body.body[0];
            if (
              statement.type === 'ReturnStatement' &&
              statement.argument &&
              statement.argument.type === 'Literal' &&
              statement.argument.value === true
            ) {
              context.report({
                node: node.key,
                messageId: 'noRedundantShouldComponentUpdate',
              });
            }
          }
        }
      },
    };
  },
});
