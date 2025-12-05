/**
 * ESLint Rule: no-noninteractive-tabindex
 * Enforce that non-interactive elements do not have tabindex
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noNoninteractiveTabindex';

type Options = {
  tags?: string[];
  roles?: string[];
  allowExpressionValues?: boolean;
};

type RuleOptions = [Options?];

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'radio', 'searchbox', 'switch', 'textbox', 'combobox', 'listbox',
  'menu', 'menubar', 'radiogroup', 'tab', 'tablist', 'tree', 'treegrid', 'grid',
  'gridcell', 'row', 'treeitem', 'progressbar', 'scrollbar', 'slider', 'spinbutton'
]);

const INTERACTIVE_ELEMENTS = new Set([
  'a', 'button', 'input', 'select', 'textarea'
]);

const DEFAULT_OPTIONS = {
  tags: [],
  roles: ['tabpanel'],
  allowExpressionValues: true,
};

/**
 * Check if element is interactive
 */
function isInteractiveElement(elementName: string): boolean {
  return INTERACTIVE_ELEMENTS.has(elementName);
}

/**
 * Check if role is interactive
 */
function isInteractiveRole(role: string, allowedRoles: string[]): boolean {
  return INTERACTIVE_ROLES.has(role) || allowedRoles.includes(role);
}

/**
 * Check if tabindex value is allowed on non-interactive elements
 * Only tabindex="-1" is allowed on non-interactive elements
 */
function isAllowedTabindex(tabindex: string | number): boolean {
  const numValue = typeof tabindex === 'string' ? parseInt(tabindex, 10) : tabindex;
  return numValue === -1;
}

/**
 * Check if role attribute is a literal string
 */
function isLiteralRole(roleAttr: TSESTree.JSXAttribute | undefined, allowExpressionValues: boolean): boolean {
  if (!roleAttr || !roleAttr.value) return false;

  // If expressions are not allowed, only literal strings are valid
  if (!allowExpressionValues) {
    return roleAttr.value.type === 'Literal' && typeof roleAttr.value.value === 'string';
  }

  // If expressions are allowed, check if it's a literal or expression
  return roleAttr.value.type === 'Literal' ||
         roleAttr.value.type === 'JSXExpressionContainer';
}

/**
 * Get role value from attribute
 */
function getRoleValue(roleAttr: TSESTree.JSXAttribute | undefined): string | null {
  if (!roleAttr || !roleAttr.value) return null;

  if (roleAttr.value.type === 'Literal' && typeof roleAttr.value.value === 'string') {
    return roleAttr.value.value;
  }

  // For expressions, we can't statically determine the value
  return null;
}

export const noNoninteractiveTabindex = createRule<RuleOptions, MessageIds>({
  name: 'no-noninteractive-tabindex',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that non-interactive elements do not have tabindex',
    },
    messages: {
      noNoninteractiveTabindex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Non-interactive Element with TabIndex',
        description: 'Non-interactive elements should not have tabindex',
        severity: 'MEDIUM',
        fix: 'Remove tabindex or make element interactive',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          roles: {
            type: 'array',
            items: { type: 'string' },
          },
          allowExpressionValues: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [DEFAULT_OPTIONS],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { tags = [], roles = ['tabpanel'], allowExpressionValues = true } = { ...DEFAULT_OPTIONS, ...options };

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const elementName = node.name.name;

        // Find tabindex attribute
        const tabindexAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'tabIndex'
        );

        if (!tabindexAttr || tabindexAttr.type !== 'JSXAttribute' || !tabindexAttr.value) return;

        // Get tabindex value
        let tabindexValue: string | number | null = null;
        if (tabindexAttr.value.type === 'Literal') {
          tabindexValue = tabindexAttr.value.value as string | number;
        }

        // If we can't determine the value, skip (dynamic values)
        if (tabindexValue === null) return;

        // Check if element is in allowed tags
        if (tags.includes(elementName)) return;

        // Check if element is inherently interactive
        if (isInteractiveElement(elementName)) return;

        // Find role attribute
        const roleAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );

        // Check if role attribute is valid for this rule
        const jsxRoleAttr = roleAttr && roleAttr.type === 'JSXAttribute' ? roleAttr : undefined;
        if (isLiteralRole(jsxRoleAttr, allowExpressionValues)) {
          const roleValue = getRoleValue(jsxRoleAttr);

          // If role is interactive or allowed, permit tabindex
          if (roleValue && isInteractiveRole(roleValue, roles)) return;

          // If role is not interactive and tabindex is not -1, it's an error
          if (!isAllowedTabindex(tabindexValue)) {
            context.report({
              node: tabindexAttr,
              messageId: 'noNoninteractiveTabindex',
            });
            return;
          }
        } else {
          // No valid role attribute, element is non-interactive
          if (!isAllowedTabindex(tabindexValue)) {
            context.report({
              node: tabindexAttr,
              messageId: 'noNoninteractiveTabindex',
            });
          }
        }
      },
    };
  },
});
