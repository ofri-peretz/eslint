/**
 * ESLint Rule: default-props-match-prop-types
 * Validate default props match prop types
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'defaultPropsMatchPropTypes';

export const defaultPropsMatchPropTypes = createRule<[], MessageIds>({
  name: 'default-props-match-prop-types',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate default props match prop types',
    },
    schema: [],
    messages: {
      defaultPropsMatchPropTypes: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Default Props Mismatch',
        description: 'Default prop does not match prop type',
        severity: 'MEDIUM',
        fix: 'Update default prop to match propTypes or update propTypes',
        documentationLink: 'https://react.dev/learn/components-and-props#default-props',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    const propTypes = new Map<string, TSESTree.Property>();
    const defaultProps = new Map<string, TSESTree.Property>();

    return {
      // Collect propTypes (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="propTypes"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          for (const prop of node.value.properties) {
            if (prop.type === 'Property' && prop.key.type === 'Identifier') {
              propTypes.set(prop.key.name, prop);
            }
          }
        }
      },

      // Collect defaultProps (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="defaultProps"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          for (const prop of node.value.properties) {
            if (prop.type === 'Property' && prop.key.type === 'Identifier') {
              defaultProps.set(prop.key.name, prop);
            }
          }
        }
      },

      // Check after collecting both
      'ClassDeclaration:exit'() {
        for (const [propName, defaultProp] of defaultProps) {
          const propType = propTypes.get(propName);
          if (propType && !isCompatibleDefaultValue(defaultProp.value, propType.value)) {
            context.report({
              node: defaultProp.key,
              messageId: 'defaultPropsMatchPropTypes',
            });
          }
        }

        // Clear maps for next class
        propTypes.clear();
        defaultProps.clear();
      },
    };
  },
});

/**
 * Check if default value is compatible with prop type
 */
function isCompatibleDefaultValue(defaultValue: TSESTree.Expression, propType: TSESTree.Expression): boolean {
  // This is a simplified check - in practice, you'd want more comprehensive validation
  // For now, just check if both are literals of the same type
  if (defaultValue.type === 'Literal' && propType.type === 'MemberExpression') {
    const propTypeName = getPropTypeName(propType);
    const defaultType = typeof defaultValue.value;

    switch (propTypeName) {
      case 'string':
        return defaultType === 'string';
      case 'number':
        return defaultType === 'number';
      case 'bool':
        return defaultType === 'boolean';
      default:
        return true; // Allow other types for now
    }
  }

  return true; // Allow complex types for now
}

/**
 * Extract prop type name from PropTypes expression
 */
function getPropTypeName(node: TSESTree.MemberExpression): string {
  if (
    node.object.type === 'Identifier' &&
    node.object.name === 'PropTypes' &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name;
  }
  return '';
}
