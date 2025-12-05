/**
 * ESLint Rule: no-interactive-element-to-noninteractive-role
 * Enforce that interactive elements don't have non-interactive ARIA roles
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'interactiveToNoninteractive';

type Options = {
  [key: string]: string[];
};

type RuleOptions = [Options?];

const INTERACTIVE_ELEMENTS = new Set([
  'a', 'button', 'input', 'select', 'textarea'
]);

const NON_INTERACTIVE_ROLES = new Set([
  'article', 'banner', 'complementary', 'img', 'listitem', 'main', 'region', 'tooltip', 'presentation', 'none'
]);

const DEFAULT_EXCEPTIONS: Record<string, string[]> = {
  tr: ['none', 'presentation'],
};

export const noInteractiveElementToNoninteractiveRole = createRule<RuleOptions, MessageIds>({
  name: 'no-interactive-element-to-noninteractive-role',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that interactive elements don\'t have non-interactive ARIA roles',
    },
    messages: {
      interactiveToNoninteractive: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Interactive Element with Non-interactive Role',
        description: 'Interactive element <{{element}}> should not have non-interactive role "{{role}}"',
        severity: 'HIGH',
        fix: 'Use a wrapper element with the role, or remove the role',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md',
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

        // Check if element is interactive
        if (!INTERACTIVE_ELEMENTS.has(element)) return;

        // Find role attribute
        const roleAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );

        if (!roleAttr || roleAttr.type !== 'JSXAttribute' || !roleAttr.value || roleAttr.value.type !== 'Literal') return;

        const role = roleAttr.value.value;
        if (typeof role !== 'string') return;

        // Check if role is non-interactive
        if (!NON_INTERACTIVE_ROLES.has(role)) return;

        // Check if this is an allowed exception
        const allowedRoles = exceptions[element] || [];
        if (allowedRoles.includes(role)) return;

        context.report({
          node: roleAttr,
          messageId: 'interactiveToNoninteractive',
          data: {
            element,
            role,
          },
        });
      },
    };
  },
});

