/**
 * ESLint Rule: img-redundant-alt
 * Enforce img alt attribute does not contain redundant words
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/img-redundant-alt.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'redundantAlt';

type Options = {
  components?: string[];
  words?: string[];
};

type RuleOptions = [Options?];

const DEFAULT_REDUNDANT_WORDS = ['image', 'photo', 'picture'];
const DEFAULT_COMPONENTS = ['img'];

export const imgRedundantAlt = createRule<RuleOptions, MessageIds>({
  name: 'img-redundant-alt',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce img alt attribute does not contain redundant words',
    },
    messages: {
      redundantAlt: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Redundant Alt Text',
        description: 'Alt text should not contain redundant words like "{{word}}"',
        severity: 'LOW',
        fix: 'Remove redundant word "{{word}}" from alt text',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/img-redundant-alt.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
          words: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { components = DEFAULT_COMPONENTS, words = DEFAULT_REDUNDANT_WORDS } = options || {};
    const redundantWords = words.map(word => word.toLowerCase());

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const elementName = node.name.name;
        if (!components.includes(elementName)) return;

        // Check if element is aria-hidden
        const ariaHidden = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'aria-hidden'
        );

        if (ariaHidden && ariaHidden.type === 'JSXAttribute' && ariaHidden.value && ariaHidden.value.type === 'Literal' && ariaHidden.value.value === true) {
          return; // Skip hidden images
        }

        // Find alt attribute
        const altAttr = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'alt'
        );

        if (!altAttr || altAttr.type !== 'JSXAttribute' || !altAttr.value || altAttr.value.type !== 'Literal') return;

        const altValue = String(altAttr.value.value);
        const altLower = altValue.toLowerCase();

        // Check for redundant words (exact matches)
        for (const word of redundantWords) {
          // Check for whole word matches (not partial)
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          if (regex.test(altLower)) {
            context.report({
              node: altAttr,
              messageId: 'redundantAlt',
              data: {
                word,
              },
            });
            break; // Only report once per alt attribute
          }
        }
      },
    };
  },
});

