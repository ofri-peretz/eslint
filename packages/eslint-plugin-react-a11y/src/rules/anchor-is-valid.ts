/**
 * ESLint Rule: anchor-is-valid
 * Enforce that anchors are valid, navigable elements
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidHref' | 'noHref' | 'preferButton';

type Options = {
  components?: string[];
  specialLink?: string[];
  aspects?: string[];
};

type RuleOptions = [Options?];

export const anchorIsValid = createRule<RuleOptions, MessageIds>({
  name: 'anchor-is-valid',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that anchors are valid, navigable elements',
    },
    messages: {
      noHref: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Anchor Missing Href',
        description: 'Anchor missing href attribute',
        severity: 'HIGH',
        fix: 'Add href attribute or use <button>',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
      invalidHref: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Href',
        description: 'Href value is not a valid URL',
        severity: 'HIGH',
        fix: 'Provide a valid URL or use <button>',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
      preferButton: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Prefer Button',
        description: 'Anchor used as a button',
        severity: 'HIGH',
        fix: 'Use <button> element for actions',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
          specialLink: { type: 'array', items: { type: 'string' } },
          aspects: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { components = [], specialLink = [] } = options || {};
    const anchors = ['a', ...components];

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || !anchors.includes(node.name.name)) {
          return;
        }

        const href = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'href'
        );

        const onClick = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'onClick'
        );

        if (!href) {
          // Check for special link props (like 'to' in React Router)
          const hasSpecialLink = specialLink.some(prop =>
            node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' &&
                attr.name.type === 'JSXIdentifier' &&
                attr.name.name === prop
            )
          );

          if (!hasSpecialLink) {
             if (onClick) {
                context.report({ node, messageId: 'preferButton' });
             } else {
                context.report({ node, messageId: 'noHref' });
             }
          }
          return;
        }

        if (href.value?.type === 'Literal') {
          const value = href.value.value;
          if (value === '#' || value === 'javascript:void(0)') {
             if (onClick) {
                context.report({ node, messageId: 'preferButton' });
             } else {
                context.report({ node, messageId: 'invalidHref' });
             }
          }
        }
      },
    };
  },
});

