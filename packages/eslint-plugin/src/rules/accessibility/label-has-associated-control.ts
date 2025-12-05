/**
 * ESLint Rule: label-has-associated-control
 * Enforce that labels have accessible controls
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingControl';

type Options = {
  labelComponents?: string[];
  labelAttributes?: string[];
  controlComponents?: string[];
  assert?: 'htmlFor' | 'nesting' | 'both' | 'either';
  depth?: number;
};

type RuleOptions = [Options?];

export const labelHasAssociatedControl = createRule<RuleOptions, MessageIds>({
  name: 'label-has-associated-control',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that labels have accessible controls',
    },
    messages: {
      missingControl: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Unassociated Label',
        description: 'Form label must have an associated control',
        severity: 'HIGH',
        fix: 'Nest the input or use htmlFor attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/label-has-associated-control.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
        {
            type: 'object',
            properties: {
                labelComponents: { type: 'array', items: { type: 'string' } },
                labelAttributes: { type: 'array', items: { type: 'string' } },
                controlComponents: { type: 'array', items: { type: 'string' } },
                assert: { type: 'string', enum: ['htmlFor', 'nesting', 'both', 'either'] },
                depth: { type: 'integer' }
            },
            additionalProperties: false
        }
    ],
  },
  defaultOptions: [{
      assert: 'either',
      depth: 2,
  }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { 
        labelComponents = [], 
        labelAttributes = [], 
        controlComponents = [], 
        assert = 'either',
        depth = 2
    } = options || {};
    
    const labelTags = ['label', ...labelComponents];
    const controlTags = ['input', 'select', 'textarea', 'meter', 'output', 'progress', ...controlComponents];

    function hasNestedControl(node: TSESTree.JSXElement, currentDepth: number): boolean {
        if (currentDepth > depth) return false;
        
        return node.children.some(child => {
            if (child.type !== 'JSXElement') return false;
            if (child.openingElement.name.type === 'JSXIdentifier' && controlTags.includes(child.openingElement.name.name)) {
                return true;
            }
            return hasNestedControl(child, currentDepth + 1);
        });
    }

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier' || !labelTags.includes(openingElement.name.name)) return;

        // Check htmlFor
        const hasHtmlFor = openingElement.attributes.some(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            (attr.name.name === 'htmlFor' || labelAttributes.includes(attr.name.name)) &&
            attr.value
        );

        // Check nesting
        const hasNesting = hasNestedControl(node, 0);

        let valid = false;
        if (assert === 'htmlFor') valid = hasHtmlFor;
        else if (assert === 'nesting') valid = hasNesting;
        else if (assert === 'both') valid = hasHtmlFor && hasNesting;
        else valid = hasHtmlFor || hasNesting; // either

        if (!valid) {
            context.report({
                node: openingElement,
                messageId: 'missingControl',
            });
        }
      },
    };
  },
});

