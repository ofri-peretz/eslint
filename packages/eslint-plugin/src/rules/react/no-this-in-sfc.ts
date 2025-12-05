/**
 * ESLint Rule: no-this-in-sfc
 * Disallow this from being used in stateless functional components
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noThisInSfc';

export const noThisInSfc = createRule<[], MessageIds>({
  name: 'no-this-in-sfc',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow this from being used in stateless functional components',
    },
    schema: [],
    messages: {
      noThisInSfc: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid this usage',
        description: 'this cannot be used in stateless functional components',
        severity: 'HIGH',
        fix: 'Convert to class component or use hooks for state',
        documentationLink: 'https://react.dev/learn/your-first-component',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    let inClassContext = false;

    return {
      // Track class context
      ClassDeclaration() {
        inClassContext = true;
      },

      'ClassDeclaration:exit'() {
        inClassContext = false;
      },

      ClassExpression() {
        inClassContext = true;
      },

      'ClassExpression:exit'() {
        inClassContext = false;
      },

      // Track method context within classes
      MethodDefinition() {
        // Already in class context, this is allowed
      },

      ThisExpression(node: TSESTree.ThisExpression) {
        // Allow 'this' in class contexts
        if (inClassContext) {
          return;
        }

        // Flag 'this' usage outside of class contexts
        // In React, this typically indicates the code should be in a class component
        context.report({
          node,
          messageId: 'noThisInSfc',
        });
      },
    };
  },
});
