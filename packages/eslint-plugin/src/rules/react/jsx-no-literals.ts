/**
 * ESLint Rule: jsx-no-literals
 * Prevent string literals in JSX
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'jsxNoLiterals';

export interface Options {
  noStrings?: boolean;
  allowedStrings?: string[];
  ignoreProps?: boolean;
}

export const jsxNoLiterals = createRule<[Options], MessageIds>({
  name: 'jsx-no-literals',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent string literals in JSX',
    },
    messages: {
      jsxNoLiterals: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'String Literal in JSX',
        description: 'String literal found in JSX',
        severity: 'MEDIUM',
        fix: 'Extract string to variable or use translation key',
        documentationLink: 'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          noStrings: {
            type: 'boolean',
            default: true,
          },
          allowedStrings: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          ignoreProps: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const [options] = context.options;
    const noStrings = options?.noStrings ?? true;
    const allowedStrings = options?.allowedStrings ?? [];
    const ignoreProps = options?.ignoreProps ?? true;

    return {
      JSXText(node: TSESTree.JSXText) {
        if (!noStrings) return;

        const text = node.value.trim();
        if (text && !allowedStrings.includes(text)) {
          context.report({
            node,
            messageId: 'jsxNoLiterals',
          });
        }
      },

      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (ignoreProps) return;

        if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const text = node.value.value.trim();
          if (text && !allowedStrings.includes(text)) {
            context.report({
              node: node.value,
              messageId: 'jsxNoLiterals',
            });
          }
        }
      },
    };
  },
});
