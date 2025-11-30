/**
 * ESLint Rule: no-danger
 * Disallow dangerouslySetInnerHTML usage (XSS prevention)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDanger';

export const noDanger = createRule<[], MessageIds>({
  name: 'no-danger',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow dangerouslySetInnerHTML usage',
    },
    schema: [],
    messages: {
      noDanger: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous HTML',
        cwe: 'CWE-79',
        description: 'Usage of dangerouslySetInnerHTML detected',
        severity: 'CRITICAL',
        fix: 'Sanitize HTML input or use React elements instead',
        documentationLink: 'https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'dangerouslySetInnerHTML'
        ) {
          context.report({
            node: node.name,
            messageId: 'noDanger',
          });
        }
      },
    };
  },
});
