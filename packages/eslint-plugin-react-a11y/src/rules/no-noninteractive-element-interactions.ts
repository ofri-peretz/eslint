/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-noninteractive-element-interactions
 * Enforce that non-interactive elements don't have interactive handlers
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-interactions.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  DYNAMIC,
  attributeValue,
  findAttribute,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'noInteraction';

type Options = {
  handlers?: string[];
};

type RuleOptions = [Options?];

const NON_INTERACTIVE_ELEMENTS = new Set([
  'main',
  'area',
  'article',
  'aside',
  'body',
  'br',
  'caption',
  'dd',
  'details',
  'dialog',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'iframe',
  'img',
  'li',
  'meter',
  'nav',
  'ol',
  'output',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'ul',
]);

const INTERACTIVE_HANDLERS = [
  'onClick',
  'onMouseDown',
  'onMouseUp',
  'onKeyPress',
  'onKeyDown',
  'onKeyUp',
];

/**
 * WAI-ARIA 1.2 document-structure and landmark roles: content, not controls.
 * An element given one of these is announced as content whatever its tag.
 */
const NON_INTERACTIVE_ROLES = new Set([
  'alert',
  'article',
  'banner',
  'blockquote',
  'caption',
  'cell',
  'complementary',
  'contentinfo',
  'definition',
  'document',
  'feed',
  'figure',
  'form',
  'group',
  'heading',
  'img',
  'list',
  'listitem',
  'log',
  'main',
  'math',
  'navigation',
  'note',
  'paragraph',
  'region',
  'rowgroup',
  'search',
  'status',
  'table',
  'term',
  'time',
  'timer',
  'tooltip',
]);

export const noNoninteractiveElementInteractions = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'no-noninteractive-element-interactions',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/no-noninteractive-element-interactions',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-noninteractive-element-interactions.md',
      description:
        "Enforce that non-interactive elements don't have interactive handlers",
      wcag: 'WCAG 2.1.1',
    },
    messages: {
      noInteraction: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Non-interactive Interaction',
        description:
          'Non-interactive element <{{element}}> should not have interactive handlers',
        severity: 'MEDIUM',
        fix: 'Use a more appropriate element or add a role',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-element-interactions.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          handlers: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let handlers: string[];

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ handlers = INTERACTIVE_HANDLERS } = options ?? {});
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        const element = node.name.name;

        // An explicit static role decides; otherwise (no role, a dynamic or
        // unknown one) the element's own semantics do.
        const roleAttr = findAttribute(node, 'role');
        const role = staticAttributeValue(roleAttr)?.trim() ?? null;
        if (role === 'presentation' || role === 'none') return;
        if (!(role !== null && NON_INTERACTIVE_ROLES.has(role))) {
          if (!NON_INTERACTIVE_ELEMENTS.has(element)) return;
        }

        // Hidden from assistive technology, or an editing surface: exempt.
        if (staticAttributeValue(findAttribute(node, 'aria-hidden')) === 'true')
          return;
        const editable = findAttribute(node, 'contentEditable');
        if (editable) {
          const v = attributeValue(editable);
          if (v === DYNAMIC || (typeof v === 'string' && v !== 'false')) return;
        }

        const hasInteractiveHandler = node.attributes.some(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            handlers.includes(attr.name.name),
        );

        if (!hasInteractiveHandler) return;

        // An interactive ARIA role makes the element a control.
        const INTERACTIVE_ARIA_ROLES = new Set([
          'button',
          'link',
          'checkbox',
          'menuitem',
          'menuitemcheckbox',
          'menuitemradio',
          'option',
          'radio',
          'searchbox',
          'switch',
          'tab',
          'textbox',
          'treeitem',
          'combobox',
          'gridcell',
          'listbox',
          'slider',
          'spinbutton',
        ]);
        if (role !== null && INTERACTIVE_ARIA_ROLES.has(role)) return;

        context.report({
          node,
          messageId: 'noInteraction',
          data: { element },
        });
      },
    };
  },
});
