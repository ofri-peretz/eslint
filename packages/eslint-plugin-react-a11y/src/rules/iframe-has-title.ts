/**
 * ESLint Rule: iframe-has-title
 * Enforce that iframes have a title attribute
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/iframe-has-title.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingTitle';

type RuleOptions = [];

export const iframeHasTitle = createRule<RuleOptions, MessageIds>({
  name: 'iframe-has-title',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that iframes have a title attribute',
    },
    messages: {
      missingTitle: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Iframe Missing Title',
        description: '<iframe> must have a unique title property',
        severity: 'CRITICAL',
        fix: 'Add title="Description of content"',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/iframe-has-title.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'iframe') {
          return;
        }

        const hasTitle = node.attributes.some(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'title' &&
            attr.value
        );

        if (!hasTitle) {
          context.report({
            node,
            messageId: 'missingTitle',
          });
        }
      },
    };
  },
});

