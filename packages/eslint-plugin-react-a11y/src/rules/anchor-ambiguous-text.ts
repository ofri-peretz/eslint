/**
 * ESLint Rule: anchor-ambiguous-text
 * Enforce that anchor text is not ambiguous
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-ambiguous-text.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'ambiguousText';

type Options = {
  words?: string[];
};

type RuleOptions = [Options?];

const DEFAULT_AMBIGUOUS_WORDS = ['click here', 'here', 'link', 'a link', 'learn more'];

/**
 * Extract accessible text from a JSX element
 */
function getAccessibleText(element: TSESTree.JSXElement): string {
  // Check for aria-label first
  const ariaLabel = element.openingElement.attributes.find(attr =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'aria-label'
  );

  if (ariaLabel && ariaLabel.type === 'JSXAttribute' && ariaLabel.value && ariaLabel.value.type === 'Literal' && typeof ariaLabel.value.value === 'string') {
    return ariaLabel.value.value;
  }

  // For img elements, use alt text
  if (element.openingElement.name.type === 'JSXIdentifier' && element.openingElement.name.name === 'img') {
    const altAttr = element.openingElement.attributes.find(attr =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === 'alt'
    );

    if (altAttr && altAttr.type === 'JSXAttribute' && altAttr.value && altAttr.value.type === 'Literal' && typeof altAttr.value.value === 'string') {
      return altAttr.value.value;
    }
  }

  // Extract text from children
  return extractTextFromChildren(element.children);
}

/**
 * Extract text content from JSX children
 */
function extractTextFromChildren(children: TSESTree.JSXChild[]): string {
  let text = '';

  for (const child of children) {
    if (child.type === 'JSXText') {
      text += child.value;
    } else if (child.type === 'JSXElement') {
      // Check if element has aria-hidden
      const hasAriaHidden = child.openingElement.attributes.some(attr =>
        attr.type === 'JSXAttribute' &&
        attr.name.type === 'JSXIdentifier' &&
        attr.name.name === 'aria-hidden' &&
        attr.value &&
        attr.value.type === 'Literal' &&
        (attr.value.value === true || attr.value.value === 'true')
      );

      if (!hasAriaHidden) {
        // For img elements in anchor text, use alt
        if (child.openingElement.name.type === 'JSXIdentifier' && child.openingElement.name.name === 'img') {
          const altAttr = child.openingElement.attributes.find(attr =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'alt'
          );

          if (altAttr && altAttr.type === 'JSXAttribute' && altAttr.value && altAttr.value.type === 'Literal' && typeof altAttr.value.value === 'string') {
            text += altAttr.value.value;
          }
        } else {
          text += extractTextFromChildren(child.children);
        }
      }
    } else if (child.type === 'JSXExpressionContainer') {
      // Handle JSX expressions like {variable} or {`template literal`}
      text += `{${extractExpressionText(child.expression)}}`;
    }
  }

  return text.trim();
}

/**
 * Extract text from JSX expression
 */
function extractExpressionText(expression: TSESTree.Expression | TSESTree.JSXEmptyExpression): string {
  if (expression.type === 'JSXEmptyExpression') {
    return '';
  }
  if (expression.type === 'Identifier') {
    return expression.name;
  } else if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value;
  } else if (expression.type === 'TemplateLiteral') {
    let result = '';
    for (let i = 0; i < expression.quasis.length; i++) {
      result += expression.quasis[i].value.raw;
      if (i < expression.expressions.length) {
        result += `\${${extractExpressionText(expression.expressions[i])}}`;
      }
    }
    return result;
  } else if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return `${extractExpressionText(expression.left)}+${extractExpressionText(expression.right)}`;
  }
  // For other expression types, return a placeholder
  return '...';
}

/**
 * Normalize text for comparison - only normalize whitespace, preserve punctuation
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace but preserve punctuation
}

export const anchorAmbiguousText = createRule<RuleOptions, MessageIds>({
  name: 'anchor-ambiguous-text',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that anchor text is not ambiguous',
    },
    messages: {
      ambiguousText: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Ambiguous Anchor Text',
        description: 'Anchor text "{{text}}" is ambiguous',
        severity: 'MEDIUM',
        fix: 'Use descriptive link text instead of ambiguous phrases',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-ambiguous-text.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          words: {
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
    const { words = DEFAULT_AMBIGUOUS_WORDS } = options || {};
    const ambiguousWords = words.map(word => normalizeText(word));

    return {
      JSXElement(node: TSESTree.JSXElement) {
        if (node.openingElement.name.type !== 'JSXIdentifier' || node.openingElement.name.name !== 'a') {
          return;
        }

        const accessibleText = getAccessibleText(node);
        const normalizedText = normalizeText(accessibleText);
        const comparisonText = normalizedText.replace(/[,.?¿!‽¡;:]/g, ''); // Remove punctuation for comparison

        // Check for exact matches (after punctuation removal)
        const hasAmbiguousText = ambiguousWords.includes(comparisonText);


        if (hasAmbiguousText) {
          context.report({
            node: node.openingElement,
            messageId: 'ambiguousText',
            data: {
              text: accessibleText,
            },
          });
        }
      },
    };
  },
});

