/**
 * ESLint Rule: checked-requires-onchange-or-readonly
 * Ensure controlled inputs have onChange or readOnly
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'checkedRequiresOnChangeOrReadOnly';

export const checkedRequiresOnchangeOrReadonly = createRule<[], MessageIds>({
  name: 'checked-requires-onchange-or-readonly',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure controlled inputs have onChange or readOnly',
    },
    messages: {
      checkedRequiresOnChangeOrReadOnly: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Controlled Input Missing Handler',
        description: 'Checked input missing onChange or readOnly',
        severity: 'MEDIUM',
        fix: 'Add onChange handler or readOnly attribute',
        documentationLink: 'https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node: TSESTree.JSXElement) {
        if (node.openingElement.name.type !== 'JSXIdentifier') {
          return;
        }

        const tagName = node.openingElement.name.name;

        // Only check input and textarea elements
        if (!['input', 'textarea', 'select'].includes(tagName)) {
          return;
        }

        const attributes = node.openingElement.attributes;
        let hasChecked = false;
        let hasValue = false;
        let hasOnChange = false;
        let hasReadOnly = false;

        for (const attr of attributes) {
          if (attr.type !== 'JSXAttribute') continue;

          const attrName = attr.name.type === 'JSXIdentifier' ? attr.name.name : '';

          if (attrName === 'checked') {
            hasChecked = true;
          } else if (attrName === 'value') {
            hasValue = true;
          } else if (attrName === 'onChange' || attrName === 'onInput') {
            hasOnChange = true;
          } else if (attrName === 'readOnly') {
            hasReadOnly = true;
          }
        }

        // Report if checked/value is present but no onChange/readOnly
        if ((hasChecked || hasValue) && !hasOnChange && !hasReadOnly) {
          context.report({
            node: node.openingElement.name,
            messageId: 'checkedRequiresOnChangeOrReadOnly',
          });
        }
      },
    };
  },
});
