/**
 * ESLint Rule: no-keyboard-inaccessible-elements
 * Detects clickable divs without keyboard support
 * 
 * @see https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'keyboardInaccessible'
  | 'addTabIndex'
  | 'addAriaRole'
  | 'useButton';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Elements to check. Default: ['div', 'span'] */
  checkElements?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if element has keyboard support
 */
function hasKeyboardSupport(node: TSESTree.JSXOpeningElement): boolean {
  // Check for tabIndex
  const hasTabIndex = node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'tabIndex'
  );

  // Check for ARIA role
  const hasRole = node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'role'
  );

  // Check for onClick handler (indicates it should be keyboard accessible)
  const hasOnClick = node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    (attr.name.name === 'onClick' || attr.name.name === 'onclick')
  );
  
  // If it has onClick but no keyboard support, it's a problem
  if (hasOnClick && !hasTabIndex && !hasRole) {
    return false;
  }
  
  return true;
}

export const noKeyboardInaccessibleElements = createRule<RuleOptions, MessageIds>({
  name: 'no-keyboard-inaccessible-elements',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects clickable divs without keyboard support',
    },
    hasSuggestions: true,
    messages: {
      keyboardInaccessible: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Keyboard inaccessible element',
        description: 'Clickable {{element}} missing keyboard support',
        severity: 'MEDIUM',
        fix: 'Add tabIndex and ARIA role or use button element',
        documentationLink: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
      }),
      addTabIndex: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add tabIndex',
        description: 'Add tabIndex for keyboard navigation',
        severity: 'LOW',
        fix: 'tabIndex={0}',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex',
      }),
      addAriaRole: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add ARIA Role',
        description: 'Add role for screen readers',
        severity: 'LOW',
        fix: 'role="button"',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/button_role',
      }),
      useButton: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use button Element',
        description: 'Use button element instead of div',
        severity: 'LOW',
        fix: '<button onClick={...}>Content</button>',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          checkElements: {
            type: 'array',
            items: { type: 'string' },
            default: ['div', 'span'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      checkElements: ['div', 'span'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      checkElements = ['div', 'span'],
    
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

      if (!checkElements.includes(elementName)) {
        return;
      }

      if (!hasKeyboardSupport(node)) {
        context.report({
          node,
          messageId: 'keyboardInaccessible',
          data: {
            element: elementName,
          },
          suggest: [
            { messageId: 'addTabIndex', fix: () => null },
            { messageId: 'addAriaRole', fix: () => null },
            { messageId: 'useButton', fix: () => null },
          ],
        });
      }
    }

    return {
      JSXOpeningElement: checkJSXElement,
    };
  },
});

