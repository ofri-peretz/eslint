/**
 * ESLint Rule: no-missing-aria-labels
 * Detects elements missing ARIA labels
 * 
 * @see https://www.w3.org/WAI/ARIA/apg/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'missingAriaLabel'
  | 'addAriaLabel'
  | 'addAriaLabelledby'
  | 'addVisibleLabel';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Elements that require ARIA labels. Default: ['button', 'input', 'select', 'textarea'] */
  requireLabels?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if element has ARIA label
 */
function hasAriaLabel(node: TSESTree.JSXOpeningElement): boolean {
  return node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    (attr.name.name === 'aria-label' || attr.name.name === 'aria-labelledby')
  );
}

export const noMissingAriaLabels = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-aria-labels',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects elements missing ARIA labels',
    },
    hasSuggestions: true,
    messages: {
      missingAriaLabel: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing ARIA label',
        description: '{{element}} missing ARIA label',
        severity: 'MEDIUM',
        fix: 'Add aria-label or aria-labelledby attribute',
        documentationLink: 'https://www.w3.org/WAI/ARIA/apg/',
      }),
      addAriaLabel: '✅ Add aria-label="descriptive text"',
      addAriaLabelledby: '✅ Add aria-labelledby="id-of-label-element"',
      addVisibleLabel: '✅ Add visible label element with htmlFor attribute',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          requireLabels: {
            type: 'array',
            items: { type: 'string' },
            default: ['button', 'input', 'select', 'textarea'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      requireLabels: ['button', 'input', 'select', 'textarea'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      requireLabels = ['button', 'input', 'select', 'textarea'],
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check JSX elements
     */
    function checkJSXElement(node: TSESTree.JSXOpeningElement) {
      if (node.name.type !== 'JSXIdentifier') {
        return;
      }

      const elementName = node.name.name;

      if (!requireLabels.includes(elementName)) {
        return;
      }

      if (!hasAriaLabel(node)) {
        context.report({
          node,
          messageId: 'missingAriaLabel',
          data: {
            element: elementName,
          },
          suggest: [
            {
              messageId: 'addAriaLabel',
              fix: () => null,
            },
            {
              messageId: 'addAriaLabelledby',
              fix: () => null,
            },
            {
              messageId: 'addVisibleLabel',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      JSXOpeningElement: checkJSXElement,
    };
  },
});

