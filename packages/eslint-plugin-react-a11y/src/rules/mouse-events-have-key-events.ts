/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: mouse-events-have-key-events
 * Enforce that onMouseOver/onMouseOut are accompanied by onFocus/onBlur for keyboard accessibility
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingOnFocus' | 'missingOnBlur';

type Options = {
  /** Handlers that must be accompanied by `onFocus`. Default `['onMouseOver']`. */
  hoverInHandlers?: string[];
  /** Handlers that must be accompanied by `onBlur`. Default `['onMouseOut']`. */
  hoverOutHandlers?: string[];
};

type RuleOptions = [Options?];

// jsx-a11y's defaults (rules/mouse-events-have-key-events.js, v6.10.2).
const DEFAULT_HOVER_IN_HANDLERS = ['onMouseOver'];
const DEFAULT_HOVER_OUT_HANDLERS = ['onMouseOut'];

export const mouseEventsHaveKeyEvents = createRule<RuleOptions, MessageIds>({
  name: 'mouse-events-have-key-events',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/mouse-events-have-key-events',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/mouse-events-have-key-events.md',
      description:
        'Enforce that onMouseOver/onMouseOut are accompanied by onFocus/onBlur',
      wcag: 'WCAG 2.1.1',
    },
    messages: {
      missingOnFocus: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Handler',
        description:
          '{{handler}} must be accompanied by onFocus for keyboard accessibility',
        severity: 'MEDIUM',
        fix: 'Add onFocus handler',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md',
      }),
      missingOnBlur: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Handler',
        description:
          '{{handler}} must be accompanied by onBlur for keyboard accessibility',
        severity: 'MEDIUM',
        fix: 'Add onBlur handler',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md',
      }),
    },
    // Shape of upstream's schema (rules/mouse-events-have-key-events.js, v6.10.2).
    schema: [
      {
        type: 'object',
        properties: {
          hoverInHandlers: { type: 'array', items: { type: 'string' } },
          hoverOutHandlers: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let hoverIn: string[];
    let hoverOut: string[];

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({
          hoverInHandlers: hoverIn = DEFAULT_HOVER_IN_HANDLERS,
          hoverOutHandlers: hoverOut = DEFAULT_HOVER_OUT_HANDLERS,
        } = options);
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const names = new Set(
          node.attributes.flatMap((attr) =>
            attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier'
              ? [attr.name.name]
              : [],
          ),
        );
        // Like upstream, only the first configured handler present is named.
        const hoverInHandler = hoverIn.find((name) => names.has(name));
        const hoverOutHandler = hoverOut.find((name) => names.has(name));
        const hasFocus = names.has('onFocus');
        const hasBlur = names.has('onBlur');

        if (hoverInHandler !== undefined && !hasFocus) {
          context.report({
            node,
            messageId: 'missingOnFocus',
            data: { handler: hoverInHandler },
          });
        }

        if (hoverOutHandler !== undefined && !hasBlur) {
          context.report({
            node,
            messageId: 'missingOnBlur',
            data: { handler: hoverOutHandler },
          });
        }
      },
    };
  },
});
