/**
 * ESLint Rule: role-has-required-aria-props
 * Enforce that elements with ARIA roles have all required ARIA attributes
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-has-required-aria-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, ARIA_REQUIRED_PROPS } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingRequiredProp';

type RuleOptions = [];

export const roleHasRequiredAriaProps = createRule<RuleOptions, MessageIds>({
  name: 'role-has-required-aria-props',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that elements with ARIA roles have all required ARIA attributes',
    },
    messages: {
      missingRequiredProp: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Required ARIA Prop',
        description: 'Role "{{role}}" requires attribute "{{prop}}"',
        severity: 'HIGH',
        fix: 'Add the missing attribute: {{prop}}',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-has-required-aria-props.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const roleAttr = node.attributes.find(
            (attr): attr is TSESTree.JSXAttribute => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            attr.name.name === 'role'
        );

        if (!roleAttr || !roleAttr.value || roleAttr.value.type !== 'Literal' || typeof roleAttr.value.value !== 'string') {
            return;
        }

        const roles = roleAttr.value.value.split(/\s+/);
        
        for (const role of roles) {
            const requiredProps = ARIA_REQUIRED_PROPS[role];
            if (requiredProps) {
                for (const prop of requiredProps) {
                    const hasProp = node.attributes.some(
                        (attr) => 
                        attr.type === 'JSXAttribute' && 
                        attr.name.type === 'JSXIdentifier' && 
                        attr.name.name === prop
                    );

                    if (!hasProp) {
                        context.report({
                            node,
                            messageId: 'missingRequiredProp',
                            data: {
                                role,
                                prop
                            }
                        });
                    }
                }
            }
        }
      },
    };
  },
});

