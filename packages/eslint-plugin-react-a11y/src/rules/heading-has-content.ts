/**
 * ESLint Rule: heading-has-content
 * Enforce that headings have content
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/heading-has-content.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingContent';

type Options = {
  components?: string[];
};

type RuleOptions = [Options?];

function hasContent(node: TSESTree.JSXOpeningElement, children: TSESTree.JSXChild[]): boolean {
  if (children.length > 0) return true;
  
  return node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => {
    if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') return false;
    const name = attr.name.name;
    return (
        name === 'dangerouslySetInnerHTML' || 
        name === 'children' ||
        name === 'title'
        // Headings don't typically use aria-label as primary content source, but usually accepted if no text
    ); 
  });
}

export const headingHasContent = createRule<RuleOptions, MessageIds>({
  name: 'heading-has-content',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that headings have content',
    },
    messages: {
      missingContent: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Heading Missing Content',
        description: 'Heading elements must have accessible content',
        severity: 'HIGH',
        fix: 'Provide text content for the heading',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/heading-has-content.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { components = [] } = options || {};
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', ...components];

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier' || !headings.includes(openingElement.name.name)) {
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

