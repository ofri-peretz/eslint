/**
 * ESLint Rule: anchor-has-content
 * Enforce that anchors have content to be accessible to screen readers
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-has-content.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingContent';

type Options = {
  components?: string[];
};

type RuleOptions = [Options?];

/**
 * Check if node has accessible content
 */
function hasContent(node: TSESTree.JSXOpeningElement, children: TSESTree.JSXChild[]): boolean {
  // Check children
  if (children.length > 0) {
    return true;
  }

  // Check props (dangerouslySetInnerHTML, children prop, aria-label, title)
  return node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => {
    if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') {
      return false;
    }
    
    const name = attr.name.name;
    return (
      name === 'dangerouslySetInnerHTML' ||
      name === 'children' ||
      name === 'aria-label' ||
      name === 'aria-labelledby' ||
      name === 'title'
    );
  });
}

export const anchorHasContent = createRule<RuleOptions, MessageIds>({
  name: 'anchor-has-content',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that anchors have content',
    },
    messages: {
      missingContent: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Anchor Missing Content',
        description: 'Anchor must have content',
        severity: 'CRITICAL',
        fix: 'Provide text content or aria-label',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-has-content.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { components = [] } = options || {};
    const anchors = ['a', ...components];

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        
        if (openingElement.name.type !== 'JSXIdentifier') {
          return;
        }

        if (!anchors.includes(openingElement.name.name)) {
          return;
        }

        if (!hasContent(openingElement, node.children)) {
          context.report({
            node: openingElement,
            messageId: 'missingContent',
          });
        }
      },
    };
  },
});

