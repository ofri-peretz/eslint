/**
 * ESLint Rule: no-redundant-roles
 * Enforce that explicit roles don't repeat implicit roles
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-redundant-roles.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'redundantRole';

type RuleOptions = [{
    nav?: string[];
    ol?: string[];
    ul?: string[];
    button?: string[];
    img?: string[];
    [key: string]: string[] | undefined;
}];

const DEFAULT_ROLE_EXCEPTIONS = {
    nav: ['navigation'],
    button: ['button'],
    body: ['document'],
    img: ['img'],
};

const IMPLICIT_ROLES: Record<string, string> = {
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
    li: 'listitem',
    link: 'link',
    main: 'main',
    menu: 'list',
    nav: 'navigation',
    ol: 'list',
    option: 'option',
    progress: 'progressbar',
    section: 'region',
    summary: 'button',
    table: 'table',
    tbody: 'rowgroup',
    textarea: 'textbox',
    tfoot: 'rowgroup',
    thead: 'rowgroup',
    tr: 'row',
    ul: 'list',
};

export const noRedundantRoles = createRule<RuleOptions, MessageIds>({
  name: 'no-redundant-roles',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that explicit roles don\'t repeat implicit roles',
    },
    messages: {
      redundantRole: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Redundant Role',
        description: 'Role "{{role}}" is redundant for <{{element}}>',
        severity: 'MEDIUM',
        fix: 'Remove the redundant role attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-redundant-roles.md',
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
  defaultOptions: [DEFAULT_ROLE_EXCEPTIONS],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        
        const element = node.name.name;
        const implicitRole = IMPLICIT_ROLES[element];

        if (!implicitRole) return;

        const roleAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'role'
        );

        if (roleAttr && roleAttr.value && roleAttr.value.type === 'Literal' && typeof roleAttr.value.value === 'string') {
          const roleValue = roleAttr.value.value;
          
          // Check if role is allowed exception
          const opts = options || {};
          const allowedRoles = opts[element] || [];
          if (allowedRoles.includes(roleValue)) return;

          if (roleValue === implicitRole) {
            context.report({
              node: roleAttr,
              messageId: 'redundantRole',
              data: {
                role: roleValue,
                element,
              },
            });
          }
        }
      },
    };
  },
});
