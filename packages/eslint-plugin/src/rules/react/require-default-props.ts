/**
 * ESLint Rule: require-default-props
 * Require default props
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireDefaultProps';

export interface Options {
  forbidDefaultForRequired?: boolean;
}

export const requireDefaultProps = createRule<[Options], MessageIds>({
  name: 'require-default-props',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require default props',
    },
    messages: {
      requireDefaultProps: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Default Props',
        description: 'Prop is not required but has no default value',
        severity: 'MEDIUM',
        fix: 'Add defaultProps or make prop required in propTypes',
        documentationLink: 'https://react.dev/learn/components-and-props#specifying-a-default-prop',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbidDefaultForRequired: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    const [options] = context.options;
    const forbidDefaultForRequired = options?.forbidDefaultForRequired ?? false;

    const propTypes = new Map<string, Map<string, TSESTree.Property>>();
    const defaultProps = new Map<string, Map<string, TSESTree.Property>>();
    const reactComponents = new Set<string>();

    return {
      // Track React component classes
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node) && node.id?.name) {
          reactComponents.add(node.id.name);
        }
      },

      // Collect propTypes (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="propTypes"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          const componentName = getComponentName(node);
          if (componentName) {
            const propsMap = new Map<string, TSESTree.Property>();
            for (const prop of node.value.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                propsMap.set(prop.key.name, prop);
              }
            }
            propTypes.set(componentName, propsMap);
          }
        }
      },

      // Collect defaultProps (PropertyDefinition is used by TypeScript parser)
      'PropertyDefinition[key.name="defaultProps"]'(node: TSESTree.PropertyDefinition) {
        if (node.value && node.value.type === 'ObjectExpression') {
          const componentName = getComponentName(node);
          if (componentName) {
            const propsMap = new Map<string, TSESTree.Property>();
            for (const prop of node.value.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                propsMap.set(prop.key.name, prop);
              }
            }
            defaultProps.set(componentName, propsMap);
          }
        }
      },

      // Check at the end
      'Program:exit'() {
        for (const [componentName, propTypesMap] of propTypes) {
          // Only check React components
          if (!reactComponents.has(componentName)) {
            continue;
          }

          const defaultsMap = defaultProps.get(componentName);

          for (const [propName, propType] of propTypesMap) {
            const hasDefault = defaultsMap?.has(propName);
            const isRequired = isRequiredProp(propType);

            if (!isRequired && !hasDefault) {
              // Find the component node to report on
              // This is a simplified version - in practice, we'd need to track component nodes
              context.report({
                node: propType.key,
                messageId: 'requireDefaultProps',
              });
            }

            if (forbidDefaultForRequired && isRequired && hasDefault && defaultsMap) {
              const defaultProp = defaultsMap.get(propName);
              if (defaultProp) {
                context.report({
                  node: defaultProp.key,
                  messageId: 'requireDefaultProps',
                });
              }
            }
          }
        }
      },
    };

    function getComponentName(node: TSESTree.PropertyDefinition): string | null {
      if (node.parent.type === 'ClassBody' && node.parent.parent.type === 'ClassDeclaration') {
        return node.parent.parent.id?.name || null;
      }
      return null;
    }

    function isReactComponent(node: TSESTree.ClassDeclaration): boolean {
      if (!node.superClass) return false;

      if (node.superClass.type === 'Identifier') {
        return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
      }

      if (node.superClass.type === 'MemberExpression') {
        return (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          node.superClass.property.type === 'Identifier' &&
          (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent')
        );
      }

      return false;
    }

    function isRequiredProp(propType: TSESTree.Property): boolean {
      // Check if prop type ends with .isRequired
      if (
        propType.value.type === 'MemberExpression' &&
        propType.value.property.type === 'Identifier' &&
        propType.value.property.name === 'isRequired'
      ) {
        return true;
      }
      return false;
    }
  },
});
