/**
 * ESLint Rule: prefer-tag-over-role
 * Enforce semantic DOM elements over ARIA role properties
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/prefer-tag-over-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'preferTagOverRole';

type RuleOptions = [];

// Mapping of ARIA roles to preferred semantic elements
const ROLE_TO_TAG_MAPPING: Record<string, string> = {
  banner: 'header',
  article: 'article',
  main: 'main',
  complementary: 'aside',
  navigation: 'nav',
  region: 'section',
  contentinfo: 'footer',
  figure: 'figure',
  img: 'img',
  list: 'ul', // or ol
  listitem: 'li',
  button: 'button',
  link: 'a',
  heading: 'h1', // or h2, h3, h4, h5, h6
  textbox: 'input', // or textarea
  checkbox: 'input[type="checkbox"]',
  radio: 'input[type="radio"]',
  searchbox: 'input[type="search"]',
};

export const preferTagOverRole = createRule<RuleOptions, MessageIds>({
  name: 'prefer-tag-over-role',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce semantic DOM elements over ARIA role properties',
    },
    messages: {
      preferTagOverRole: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Prefer Semantic Tag Over Role',
        description: 'Use semantic HTML element <{{tag}}> instead of role="{{role}}"',
        severity: 'LOW',
        fix: 'Replace <{{element}}> with <{{tag}}> and remove role attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/prefer-tag-over-role.md',
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

        // Find role attribute
        const roleAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'role'
        );

        if (!roleAttr || roleAttr.type !== 'JSXAttribute' || !roleAttr.value || roleAttr.value.type !== 'Literal') return;

        const roleValue = roleAttr.value.value;
        if (typeof roleValue !== 'string') return;

        // Check if there's a preferred semantic element for this role
        const preferredTag = ROLE_TO_TAG_MAPPING[roleValue];
        if (!preferredTag) return;

        // Don't flag if the element is already the preferred semantic element
        if (elementName === preferredTag.split('[')[0]) return; // Handle cases like 'input[type="checkbox"]'

        // Special handling for input types
        if (preferredTag.includes('input[type=')) {
          const inputType = preferredTag.match(/input\[type="([^"]+)"\]/)?.[1];
          if (inputType) {
            // Check if there's a type attribute that matches
            const typeAttr = node.attributes.find(attr =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'type' &&
              attr.value?.type === 'Literal' &&
              attr.value.value === inputType
            );

            if (typeAttr && elementName === 'input') return; // Already correct
          }
        }

        // Report the issue
        context.report({
          node: roleAttr,
          messageId: 'preferTagOverRole',
          data: {
            tag: preferredTag,
            role: roleValue,
            element: elementName,
          },
        });
      },
    };
  },
});
