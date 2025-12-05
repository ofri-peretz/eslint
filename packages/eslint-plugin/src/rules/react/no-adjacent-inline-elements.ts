/**
 * ESLint Rule: no-adjacent-inline-elements
 * Prevent adjacent inline elements
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noAdjacentInlineElements';

const INLINE_ELEMENTS = new Set([
  'span', 'a', 'strong', 'em', 'b', 'i', 'u', 'small', 'big', 'sub', 'sup',
  'code', 'kbd', 'samp', 'var', 'cite', 'abbr', 'acronym', 'dfn', 'q', 'time',
  'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'wbr', 'ins', 'del', 's', 'strike'
]);

export const noAdjacentInlineElements = createRule<[], MessageIds>({
  name: 'no-adjacent-inline-elements',
  meta: {
    type: 'problem',
    docs: {
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
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXElement(node: TSESTree.JSXElement) {
        if (node.children.length < 2) return;

        // Find sequences of adjacent inline elements
        let consecutiveInlineCount = 0;
        let lastInlineElement: TSESTree.JSXElement | null = null;

        for (const child of node.children) {
          if (child.type === 'JSXElement') {
            const elementName = getElementName(child);
            if (elementName && INLINE_ELEMENTS.has(elementName)) {
              consecutiveInlineCount++;
              lastInlineElement = child;

              if (consecutiveInlineCount >= 2) {
                context.report({
                  node: lastInlineElement.openingElement.name,
                  messageId: 'noAdjacentInlineElements',
                });
              }
            } else {
              consecutiveInlineCount = 0;
              lastInlineElement = null;
            }
          } else if (child.type === 'JSXText') {
            // Reset counter on text nodes
            consecutiveInlineCount = 0;
            lastInlineElement = null;
          }
        }
      },
    };
  },
});

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
