/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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

/**
 * Is this a DOM element rather than a React component?
 *
 * JSX's own convention is the only signal available without type information:
 * lowercase is a host element, uppercase or dotted (`<Foo.Bar>`) is a
 * component. Anything with a dot is a member expression and never a tag.
 */
function isHostElement(name: string): boolean {
  return name.length > 0 && name[0] === name[0].toLowerCase() && !name.includes('.');
}

export const preferTagOverRole = createRule<RuleOptions, MessageIds>({
  name: 'prefer-tag-over-role',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/prefer-tag-over-role.md',
      description: 'Enforce semantic DOM elements over ARIA role properties',
      wcag: 'WCAG 1.3.1',
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
        const roleAttr = node.attributes.find(
          (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute =>
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

        // Don't flag if the element is already the preferred semantic element.
        // Comparing against the tag before '[' also accepts every input variant
        // (`input[type="checkbox"]` etc.) on an <input> element, so no separate
        // type-attribute matching is needed here.
        if (elementName === preferredTag.split('[')[0]) return;

        // A CUSTOM COMPONENT is not a DOM element, and this rule cannot know
        // what one renders.
        //
        // JSX spells the difference: a lowercase name is a host element, an
        // uppercase or dotted one is a component. `<Box role="img">` renders
        // whatever Box decides — in MUI you would write `component="img"`, and
        // nothing here can see that. Telling the author to write `<img>`
        // instead of their component is advice about a name, not about the DOM
        // that ships.
        //
        // 8 of this rule's 31 corpus findings were this: MUI `<Box>`,
        // `<MuiLink>` and `<LinkMui>`.
        if (!isHostElement(elementName)) return;

        // `<svg role="img">` IS THE RECOMMENDED PATTERN, not a violation.
        //
        // An inline SVG needs an explicit `role="img"` with an accessible name
        // for assistive technology to treat it as a single graphic rather than
        // walking its shapes. It cannot be rewritten as `<img>` without moving
        // to an external file and giving up everything inline SVG is for —
        // `currentColor`, styling, animation.
        //
        // This was the largest false-positive class in the rule: 23 of 31
        // corpus findings, every one an icon component doing the right thing.
        if (elementName === 'svg' && roleValue === 'img') return;

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
