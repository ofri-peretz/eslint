/**
 * ESLint Rule: no-noninteractive-element-to-interactive-role
 * Enforce that non-interactive elements don't have interactive ARIA roles
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-to-interactive-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noninteractiveToInteractive';

type Options = {
  [key: string]: string[];
};

type RuleOptions = [Options?];

const NON_INTERACTIVE_ELEMENTS = new Set([
  'main', 'area', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'li', 'ul', 'ol',
  'p', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'div', 'span',
  'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'caption'
]);

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'radio', 'searchbox', 'switch', 'textbox', 'combobox', 'listbox',
  'menu', 'menubar', 'radiogroup', 'tab', 'tablist', 'tree', 'treegrid', 'grid',
  'gridcell', 'row', 'treeitem'
]);

const DEFAULT_EXCEPTIONS: Record<string, string[]> = {
  ul: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
  ol: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
  li: ['menuitem', 'option', 'row', 'tab', 'treeitem'],
  table: ['grid'],
  td: ['gridcell'],
};

export const noNoninteractiveElementToInteractiveRole = createRule<RuleOptions, MessageIds>({
  name: 'no-noninteractive-element-to-interactive-role',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that non-interactive elements don\'t have interactive ARIA roles',
    },
    messages: {
      noninteractiveToInteractive: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Non-interactive Element with Interactive Role',
        description: 'Non-interactive element <{{element}}> should not have interactive role "{{role}}"',
        severity: 'HIGH',
        fix: 'Use an interactive element or wrap in appropriate container',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-to-interactive-role.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    ],
  },
  defaultOptions: [DEFAULT_EXCEPTIONS],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const exceptions = { ...DEFAULT_EXCEPTIONS, ...options };

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const element = node.name.name;

        // Check if element is non-interactive
        if (!NON_INTERACTIVE_ELEMENTS.has(element)) return;

        // Find role attribute
        const roleAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );

        if (!roleAttr || roleAttr.type !== 'JSXAttribute' || !roleAttr.value || roleAttr.value.type !== 'Literal') return;

        const role = roleAttr.value.value;
        if (typeof role !== 'string') return;

        // Check if role is interactive
        if (!INTERACTIVE_ROLES.has(role)) return;

        // Check if this is an allowed exception
        const allowedRoles = exceptions[element] || [];
        if (allowedRoles.includes(role)) return;

        context.report({
          node: roleAttr,
          messageId: 'noninteractiveToInteractive',
          data: {
            element,
            role,
          },
        });
      },
    };
  },
});

