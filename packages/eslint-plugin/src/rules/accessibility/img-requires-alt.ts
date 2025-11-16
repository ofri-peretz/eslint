/**
 * ESLint Rule: img-requires-alt
 * Enforce alt text on images with user impact context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'missingAlt' | 'emptyAlt' | 'addDescriptiveAlt' | 'useEmptyAlt';

export interface Options {
  /** Allow aria-label as alternative to alt text. Default: false */
  allowAriaLabel?: boolean;
  
  /** Allow aria-labelledby as alternative to alt text. Default: false */
  allowAriaLabelledby?: boolean;
}

type RuleOptions = [Options?];

export const imgRequiresAlt = createRule<RuleOptions, MessageIds>({
  name: 'img-requires-alt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce alt text on images with accessibility impact context',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 45% reduction (51→28 tokens) - image alt text improves accessibility
      missingAlt: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Image missing alt text',
        cwe: 'CWE-252',
        description: 'Image missing alt text',
        severity: 'CRITICAL',
        fix: 'Add alt="Descriptive text about image"',
        documentationLink: 'https://www.w3.org/WAI/tutorials/images/',
      }),
      emptyAlt: '♿ Empty alt text detected | Consider: {{consideration}}',
      addDescriptiveAlt: '✅ Add descriptive alt text',
      useEmptyAlt: '✅ Use empty alt="" for decorative images',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowAriaLabel: {
            type: 'boolean',
            default: false,
          },
          allowAriaLabelledby: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowAriaLabel: false,
      allowAriaLabelledby: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowAriaLabel = false, allowAriaLabelledby = false } = options;

    /**
     * Check if element has alt attribute
     */
    const hasAltAttribute = (node: TSESTree.JSXOpeningElement): boolean => {
      return node.attributes.some(
        (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && attr.name.name === 'alt'
      );
    };

    /**
     * Get alt attribute value
     */
    const getAltValue = (node: TSESTree.JSXOpeningElement): string | null => {
      const altAttr = node.attributes.find(
        (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute => attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && attr.name.name === 'alt'
      );

      if (!altAttr || altAttr.type !== 'JSXAttribute') return null;

      if (!altAttr.value) return '';
      
      if (altAttr.value.type === 'Literal' && typeof altAttr.value.value === 'string') {
        return altAttr.value.value;
      }

      return null; // Dynamic value
    };

    /**
     * Check for aria-label or aria-labelledby
     */
    const hasAriaLabel = (node: TSESTree.JSXOpeningElement): boolean => {
      if (!allowAriaLabel && !allowAriaLabelledby) return false;

      return node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') return false;
        
        return (
          (allowAriaLabel && attr.name.name === 'aria-label') ||
          (allowAriaLabelledby && attr.name.name === 'aria-labelledby')
        );
      });
    };

    /**
     * Extract context about the image
     */
    const getImageContext = (node: TSESTree.JSXOpeningElement): {
      src?: string;
      usage: string;
      surroundingText: string;
    } => {
      const srcAttr = node.attributes.find(
        (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute => attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && attr.name.name === 'src'
      );

      let src: string | undefined;
      if (srcAttr && srcAttr.type === 'JSXAttribute' && srcAttr.value?.type === 'Literal') {
        src = String(srcAttr.value.value);
      }

      return {
        src,
        usage: 'Content image', // Could be enhanced to detect context
        surroundingText: 'Unknown context',
      };
    };

    /**
     * Suggest alt text based on context
     */
    const suggestAltText = (imageContext: ReturnType<typeof getImageContext>): string[] => {
      const suggestions: string[] = [];

      if (imageContext.src) {
        // Extract filename-based suggestion
        const filename = imageContext.src.split('/').pop()?.replace(/\.[^.]+$/, '');
        if (filename) {
          suggestions.push(filename.replace(/-|_/g, ' '));
        }
      }

      suggestions.push('Descriptive text about the image');
      suggestions.push('Product image showing [description]');

      return suggestions;
    };

    return {
      'JSXOpeningElement[name.name="img"]'(node: TSESTree.JSXOpeningElement) {
        // Check if has alt or aria-label
        if (hasAltAttribute(node)) {
          const altValue = getAltValue(node);
          
          // Check if alt is empty (could be decorative)
          if (altValue === '') {
            // Empty alt is valid for decorative images, but we can suggest verification
            return;
          }
          
          return; // Has alt text
        }

        if (hasAriaLabel(node)) {
          return; // Has aria-label as alternative
        }

        // Missing alt text
        const imageContext = getImageContext(node);
        const suggestions = suggestAltText(imageContext);

        context.report({
          node,
          messageId: 'missingAlt',
          data: {
            affectedUsers: '8% of users',
            wcagLevel: 'A',
            suggestion: suggestions[0] || 'Descriptive text',
          },
          suggest: [
            {
              messageId: 'addDescriptiveAlt',
              fix: (fixer: TSESLint.RuleFixer) => {
                // Add alt with placeholder
                const lastAttr = node.attributes[node.attributes.length - 1];
                const insertAfter = lastAttr || node.name;
                
                return fixer.insertTextAfter(insertAfter, ' alt="TODO: Add descriptive text"');
              },
            },
            {
              messageId: 'useEmptyAlt',
              fix: (fixer: TSESLint.RuleFixer) => {
                const lastAttr = node.attributes[node.attributes.length - 1];
                const insertAfter = lastAttr || node.name;
                
                return fixer.insertTextAfter(insertAfter, ' alt=""');
              },
            },
          ],
        });
      },
    };
  },
});

