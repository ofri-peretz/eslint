/**
 * ESLint Rule: media-has-caption
 * Enforce that media elements have captions
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/media-has-caption.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingCaption';

type Options = {
  audio?: string[];
  video?: string[];
  track?: string[];
};

type RuleOptions = [Options?];

export const mediaHasCaption = createRule<RuleOptions, MessageIds>({
  name: 'media-has-caption',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that media elements have captions',
    },
    messages: {
      missingCaption: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Captions',
        description: '<{{element}}> must have a <track> for captions',
        severity: 'HIGH',
        fix: 'Add <track kind="captions" />',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/media-has-caption.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          audio: { type: 'array', items: { type: 'string' } },
          video: { type: 'array', items: { type: 'string' } },
          track: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { audio = [], video = [], track = [] } = options || {};
    const audioElements = ['audio', ...audio];
    const videoElements = ['video', ...video];
    const trackElements = ['track', ...track];

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier') return;

        const name = openingElement.name.name;
        if (!audioElements.includes(name) && !videoElements.includes(name)) return;
        
        // Check if muted is true for video (no captions needed if muted?) - arguably still needed for accessibility standards but often skipped in simplified rules.
        // W3C says captions needed for audio content.

        // Check children for track
        const hasCaption = node.children.some(child => {
            if (child.type !== 'JSXElement') return false;
            const childName = child.openingElement.name;
            if (childName.type !== 'JSXIdentifier' || !trackElements.includes(childName.name)) return false;
            
            // Check kind attribute
            return child.openingElement.attributes.some(attr => 
                attr.type === 'JSXAttribute' && 
                attr.name.type === 'JSXIdentifier' && 
                attr.name.name === 'kind' && 
                attr.value && 
                attr.value.type === 'Literal' && 
                (attr.value.value === 'captions' || attr.value.value === 'descriptions')
            );
        });

        if (!hasCaption) {
          context.report({
            node: openingElement,
            messageId: 'missingCaption',
            data: {
                element: name
            }
          });
        }
      },
    };
  },
});

