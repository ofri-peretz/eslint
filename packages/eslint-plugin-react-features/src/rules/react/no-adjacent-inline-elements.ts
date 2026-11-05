/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-adjacent-inline-elements
 * Prevent adjacent inline elements
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noAdjacentInlineElements';

const INLINE_ELEMENTS = new Set([
  'span',
  'a',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'small',
  'big',
  'sub',
  'sup',
  'code',
  'kbd',
  'samp',
  'var',
  'cite',
  'abbr',
  'acronym',
  'dfn',
  'q',
  'time',
  'mark',
  'ruby',
  'rt',
  'rp',
  'bdi',
  'bdo',
  'wbr',
  'ins',
  'del',
  's',
  'strike',
]);

export const noAdjacentInlineElements = createRule<[], MessageIds>({
  name: 'no-adjacent-inline-elements',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-adjacent-inline-elements.md',
      description: 'Prevent adjacent inline elements',
    },
    schema: [],
    messages: {
      noAdjacentInlineElements: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Adjacent Inline Elements',
        description: 'Adjacent inline elements can cause layout issues',
        severity: 'MEDIUM',
        fix: 'Wrap adjacent inline elements in a block-level container',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    /**
     * Report each inline host element that follows another with nothing
     * between them but an empty `{/* comment *\/}`. Text (any whitespace
     * included), a braced string and a dynamic child separate them.
     */
    function checkChildren(node: TSESTree.JSXElement | TSESTree.JSXFragment) {
      let previousInline = false;
      for (const child of node.children) {
        if (child.type === 'JSXElement') {
          const elementName = getElementName(child);
          const inline =
            elementName !== null && INLINE_ELEMENTS.has(elementName);
          if (inline && previousInline) {
            context.report({
              node: child.openingElement.name,
              messageId: 'noAdjacentInlineElements',
            });
          }
          previousInline = inline;
        } else if (rendersSomething(child)) {
          previousInline = false;
        }
      }
    }

    return {
      JSXElement: checkChildren,
      JSXFragment: checkChildren,
    };
  },
});

/**
 * Does this non-element child separate its siblings? Text does, including
 * line-break whitespace: JSX drops it, but the doc treats elements on their
 * own lines (laid out by CSS, e.g. a flex gap) as separated, a judgment the
 * rule leaves to the author. A dynamic child may render text. Only an empty
 * `{/* comment *\/}` renders nothing.
 */
function rendersSomething(child: TSESTree.JSXChild): boolean {
  return !(
    child.type === 'JSXExpressionContainer' &&
    child.expression.type === 'JSXEmptyExpression'
  );
}

/**
 * Get the name of a JSX element
 */
function getElementName(node: TSESTree.JSXElement): string | null {
  const openingElement = node.openingElement;
  if (openingElement.name.type === 'JSXIdentifier') {
    return openingElement.name.name;
  }
  return null;
}
