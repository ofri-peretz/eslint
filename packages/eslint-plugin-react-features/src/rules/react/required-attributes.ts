/**
 * ESLint Rule: required-attributes
 * Enforce required attributes on React components/elements with customizable ignore lists
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingAttribute' | 'addAttribute';

interface AttributeRule {
  attribute: string;
  ignoreTags?: string[];
  message?: string;
  suggestedValue?: string;
}

export interface Options {
  /** Array of required attribute rules */
  attributes?: AttributeRule[];
  
  /** Component names to ignore for this rule */
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
      // 🎯 Token optimization: 41% reduction (54→32 tokens) - required attributes for form/a11y
      missingAttribute: formatLLMMessage({
        icon: '📝',
        issueName: 'Missing required attribute',
        cwe: 'CWE-252',
        description: '{{element}} missing {{attribute}}',
        severity: 'MEDIUM',
        fix: 'Add {{attribute}}="{{suggestedValue}}" ({{purpose}})',
        documentationLink: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
      }),
      addAttribute: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Attribute',
        description: 'Add required attribute',
        severity: 'LOW',
        fix: '{{attribute}}="{{suggestedValue}}"',
        documentationLink: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
      }),
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
    const {
attributes = [], ignoreComponents = [] 
}: Options = options || {};

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
      return node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => {
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
    /**
     * Check if an element is a form element that should have type/name attributes
     */
    const isFormElement = (elementName: string): boolean => {
      return ['input', 'button', 'select', 'textarea'].includes(elementName.toLowerCase());
    };

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

          // SKIP: type/name attributes only apply to form elements
          if ((attribute === 'type' || attribute === 'name') && !isFormElement(elementName)) {
            continue;
          }

          // Check if attribute exists
          if (hasAttribute(node, attribute)) {
            continue;
          }

          // Attribute is missing - report violation
          const purpose = message || getAttributePurpose(attribute);
          const defaultValue = suggestedValue || getDefaultSuggestedValue(attribute, elementName);

          context.report({
            node,
            messageId: 'missingAttribute',
            data: {
              element: elementName,
              attribute,
              suggestedValue: defaultValue,
              purpose,
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

