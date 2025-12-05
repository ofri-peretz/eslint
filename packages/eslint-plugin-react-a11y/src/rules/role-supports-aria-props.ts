/**
 * ESLint Rule: role-supports-aria-props
 * Enforce that elements with roles contain only supported ARIA properties
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-supports-aria-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, ROLE_SUPPORTED_ARIA_PROPS } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'unsupportedAriaProp';

type RuleOptions = [];

// Implicit roles for HTML elements
const IMPLICIT_ROLES: Record<string, string> = {
  a: 'link',
  area: 'link',
  article: 'article',
  aside: 'complementary',
  body: 'document',
  button: 'button',
  datalist: 'listbox',
  details: 'group',
  dialog: 'dialog',
  figure: 'figure',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  hr: 'separator',
  img: 'img',
  input: 'textbox', // varies by type, but textbox is common
  li: 'listitem',
  link: 'link',
  main: 'main',
  menu: 'list',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  progress: 'progressbar',
  section: 'region',
  select: 'listbox',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  thead: 'rowgroup',
  tr: 'row',
  ul: 'list',
};

export const roleSupportsAriaProps = createRule<RuleOptions, MessageIds>({
  name: 'role-supports-aria-props',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that elements with roles contain only supported ARIA properties',
    },
    messages: {
      unsupportedAriaProp: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Unsupported ARIA Property',
        description: 'Role "{{role}}" does not support property "{{prop}}"',
        severity: 'HIGH',
        fix: 'Remove unsupported ARIA property or change role',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-supports-aria-props.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const elementName = node.name.name;
        let role = '';

        // Check explicit role
        const roleAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );

        if (roleAttr && roleAttr.type === 'JSXAttribute' && roleAttr.value && roleAttr.value.type === 'Literal' && typeof roleAttr.value.value === 'string') {
          role = roleAttr.value.value;
        } else {
          // Use implicit role
          role = IMPLICIT_ROLES[elementName] || '';
        }

        if (!role || !ROLE_SUPPORTED_ARIA_PROPS[role]) return;

        const supportedProps = ROLE_SUPPORTED_ARIA_PROPS[role];

        // Check all aria-* attributes
        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;

          const attrName = attr.name.name;
          if (!attrName.startsWith('aria-')) continue;

          if (!supportedProps.has(attrName)) {
            context.report({
              node: attr,
              messageId: 'unsupportedAriaProp',
              data: {
                role,
                prop: attrName,
              },
            });
          }
        }
      },
    };
  },
});

