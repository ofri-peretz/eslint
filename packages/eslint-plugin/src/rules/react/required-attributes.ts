/**
 * ESLint Rule: required-attributes
 * Enforce required attributes on React components/elements with customizable ignore lists
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds = 'missingAttribute' | 'addAttribute';

interface AttributeRule {
  attribute: string;
  ignoreTags?: string[];
  message?: string;
  suggestedValue?: string;
}

export interface Options {
  attributes?: AttributeRule[];
  ignoreComponents?: string[];
}

type RuleOptions = [Options?];

export const requiredAttributes = createRule<RuleOptions, MessageIds>({
  name: 'required-attributes',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce required attributes on React components with customizable ignore lists',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      missingAttribute:
        '📝 Missing required attribute | MEDIUM\n' +
        '   ❌ Current: <element> without {{attribute}}\n' +
        '   ✅ Fix: Add {{attribute}}="value" to element\n' +
        '   📚 https://www.w3.org/WAI/fundamentals/accessibility-intro/',
      addAttribute: '✅ Add {{attribute}}="{{suggestedValue}}"',
    },
    schema: [
      {
        type: 'object',
        properties: {
          attributes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attribute: { type: 'string' },
                ignoreTags: {
                  type: 'array',
                  items: { type: 'string' },
                },
                message: { type: 'string' },
                suggestedValue: { type: 'string' },
              },
              required: ['attribute'],
            },
            default: [],
          },
          ignoreComponents: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Components to ignore globally',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      attributes: [],
      ignoreComponents: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { attributes = [], ignoreComponents = [] } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Get element name from JSX opening element
     */
    const getElementName = (node: TSESTree.JSXOpeningElement): string | null => {
      if (node.name.type === 'JSXIdentifier') {
        return node.name.name;
      }
      if (node.name.type === 'JSXMemberExpression') {
        // Handle cases like <Box.Item>
        let current: TSESTree.JSXIdentifier | TSESTree.JSXMemberExpression = node.name;
        const parts: string[] = [];
        while (current.type === 'JSXMemberExpression') {
          if (current.property.type === 'JSXIdentifier') {
            parts.unshift(current.property.name);
          }
          current = current.object as TSESTree.JSXIdentifier | TSESTree.JSXMemberExpression;
        }
        if (current.type === 'JSXIdentifier') {
          parts.unshift(current.name);
        }
        return parts.join('.');
      }
      return null;
    };

    /**
     * Check if element has attribute
     */
    const hasAttribute = (node: TSESTree.JSXOpeningElement, attrName: string): boolean => {
      return node.attributes.some((attr: any) => {
        if (attr.type !== 'JSXAttribute') return false;
        if (attr.name.type !== 'JSXIdentifier') return false;
        return attr.name.name === attrName;
      });
    };

    /**
     * Get attribute purpose based on name
     */
    const getAttributePurpose = (attribute: string): string => {
      const purposes: Record<string, string> = {
        'data-testid': 'Testing & QA automation',
        'aria-label': 'Accessibility for screen readers',
        'aria-describedby': 'Accessibility description',
        'aria-labelledby': 'Accessibility label reference',
        'role': 'Accessibility role definition',
        'tabIndex': 'Keyboard navigation order',
        'alt': 'Image accessibility',
        'title': 'Tooltip / additional context',
        'id': 'Element identification',
      };
      return purposes[attribute] || 'Required for consistency';
    };

    /**
     * Get default suggested value for attribute
     */
    const getDefaultSuggestedValue = (attribute: string, elementName: string): string => {
      if (attribute === 'data-testid') {
        // Generate kebab-case testid from element name
        const kebab = elementName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        return kebab;
      }
      if (attribute.startsWith('aria-')) {
        return 'TODO: Add descriptive label';
      }
      if (attribute === 'tabIndex') {
        return '0';
      }
      return 'TODO';
    };

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const elementName = getElementName(node);
        if (!elementName) return;

        // Check if element is in global ignore list
        if (ignoreComponents.includes(elementName)) {
          return;
        }

        // Check each required attribute
        for (const attrRule of attributes) {
          const { attribute, ignoreTags = [], message, suggestedValue } = attrRule;

          // Check if this element should be ignored for this attribute
          if (ignoreTags.includes(elementName)) {
            continue;
          }

          // Check if attribute exists
          if (hasAttribute(node, attribute)) {
            continue;
          }

          // Attribute is missing - report violation
          const purpose = message || getAttributePurpose(attribute);
          const defaultValue = suggestedValue || getDefaultSuggestedValue(attribute, elementName);

          const llmContext = generateLLMContext('react/required-attributes', {
            severity: 'error',
            category: 'accessibility',
            filePath: filename,
            node,
            details: {
              missingAttribute: attribute,
              element: elementName,
              purpose,
              impact: {
                testing: attribute === 'data-testid' ? 'Tests cannot reliably select this element' : undefined,
                accessibility: attribute.startsWith('aria-') || attribute === 'alt' 
                  ? 'Screen reader users cannot understand this element' 
                  : undefined,
                navigation: attribute === 'tabIndex' ? 'Keyboard users cannot navigate to this element' : undefined,
              },
              quickFix: {
                automated: true,
                suggestedValue: defaultValue,
                explanation: `Add ${attribute}="${defaultValue}" to the element`,
              },
              whyRequired: {
                context: purpose,
                examples: [
                  `<${elementName} ${attribute}="${defaultValue}">`,
                ],
              },
              ignoringThisRule: {
                perElement: `Add "${elementName}" to ignoreTags for ${attribute}`,
                globally: `Add "${elementName}" to ignoreComponents`,
                example: `{
  attributes: [{
    attribute: "${attribute}",
    ignoreTags: ["${elementName}"]
  }]
}`,
              },
            },
            resources: {
              docs: attribute.startsWith('aria-') 
                ? 'https://www.w3.org/WAI/ARIA/apg/'
                : attribute === 'data-testid'
                ? 'https://testing-library.com/docs/queries/bytestid'
                : undefined,
            },
          });

          context.report({
            node,
            messageId: 'missingAttribute',
            data: {
              attribute,
              element: elementName,
              purpose,
              ...llmContext,
            },
            suggest: [
              {
                messageId: 'addAttribute',
                data: {
                  attribute,
                  suggestedValue: defaultValue,
                },
                fix: (fixer: TSESLint.RuleFixer) => {
                  // Insert attribute after element name
                  const nameNode = node.name;
                  return fixer.insertTextAfter(
                    nameNode,
                    ` ${attribute}="${defaultValue}"`
                  );
                },
              },
            ],
          });
        }
      },
    };
  },
});

