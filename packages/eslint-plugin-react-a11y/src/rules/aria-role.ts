/**
 * ESLint Rule: aria-role
 * Enforce that elements with ARIA roles have valid values
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, ARIA_ROLES } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidRole';

type Options = {
  allowedInvalidRoles?: string[];
  ignoreNonDOM?: boolean;
};

type RuleOptions = [Options?];

export const ariaRole = createRule<RuleOptions, MessageIds>({
  name: 'aria-role',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that elements with ARIA roles have valid values',
    },
    messages: {
      invalidRole: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid ARIA Role',
        description: 'Role "{{role}}" is not a valid ARIA role',
        severity: 'HIGH',
        fix: 'Use a valid ARIA role (e.g., button, alert)',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-role.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedInvalidRoles: {
            type: 'array',
            items: { type: 'string' },
          },
          ignoreNonDOM: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowedInvalidRoles = [] } = options || {};

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'role') {
          return;
        }

        if (!node.value || node.value.type !== 'Literal' || typeof node.value.value !== 'string') {
          // Skip dynamic values or empty values
          return;
        }

        const roles = node.value.value.split(/\s+/);
        
        for (const role of roles) {
          if (!ARIA_ROLES.has(role) && !allowedInvalidRoles.includes(role)) {
            context.report({
              node,
              messageId: 'invalidRole',
              data: {
                role,
              },
            });
          }
        }
      },
    };
  },
});

