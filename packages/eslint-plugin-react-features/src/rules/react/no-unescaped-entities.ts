/**
 * ESLint Rule: no-unescaped-entities
 * Prevent unescaped entities
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noUnescapedEntities';

const UNESCAPED_ENTITIES = /[<>"]/;

export const noUnescapedEntities = createRule<[], MessageIds>({
  name: 'no-unescaped-entities',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unescaped entities',
    },
    messages: {
      noUnescapedEntities: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unescaped Entity',
        description: 'Unescaped HTML entity in JSX text',
        severity: 'MEDIUM',
        fix: 'Use HTML entities (&lt;, &gt;, &quot;) or wrap in curly braces',
        documentationLink: 'https://react.dev/learn/javascript-in-jsx-with-curly-braces',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXText(node: TSESTree.JSXText) {
        const text = node.value;

        // Skip whitespace-only text
        if (!text.trim()) {
          return;
        }

        // Check for unescaped entities
        if (UNESCAPED_ENTITIES.test(text)) {
          context.report({
            node,
            messageId: 'noUnescapedEntities',
          });
        }
      },
    };
  },
});
