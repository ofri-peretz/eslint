/**
 * ESLint Rule: prop-types
 * Enforce prop types usage
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'propTypes';

export interface Options {
  ignore?: string[];
  customValidators?: string[];
  skipUndeclared?: boolean;
}

export const propTypes = createRule<[Options], MessageIds>({
  name: 'prop-types',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce prop types usage',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
          },
          customValidators: {
            type: 'array',
            items: { type: 'string' },
          },
          skipUndeclared: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      propTypes: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing PropTypes',
        description: 'Component missing prop type validation',
        severity: 'MEDIUM',
        fix: 'Add propTypes static property or use TypeScript',
        documentationLink: 'https://react.dev/learn/components-and-props#specifying-a-default-prop',
      }),
    },
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, [Options]>) {
    const [options] = context.options;
    const ignore = options?.ignore ?? [];
    const skipUndeclared = options?.skipUndeclared ?? false;

    const components: TSESTree.ClassDeclaration[] = [];
    const propTypesMap = new Map<string, TSESTree.ClassProperty>();

    return {
      // Collect class components
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node) && !ignore.includes(node.id?.name || '')) {
          components.push(node);
        }
      },

      // Collect propTypes (handles both ClassProperty and PropertyDefinition)
      'PropertyDefinition[key.name="propTypes"], ClassProperty[key.name="propTypes"]'(node: TSESTree.PropertyDefinition | TSESTree.ClassProperty) {
        if (node.parent.type === 'ClassBody') {
          const classNode = node.parent.parent as TSESTree.ClassDeclaration;
          if (classNode.id?.name) {
            propTypesMap.set(classNode.id.name, node);
          }
        }
      },

      // Check components at the end
      'Program:exit'() {
        for (const component of components) {
          const componentName = component.id?.name;
          if (!componentName) continue;

          const propTypesProp = propTypesMap.get(componentName);

          // Skip if component has propTypes or if skipUndeclared is true and no props are used
          if (propTypesProp || (skipUndeclared && !hasPropsUsage(component))) {
            continue;
          }

          context.report({
            node: component.id || component,
            messageId: 'propTypes',
          });
        }
      },
    };

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

    function hasPropsUsage(node: TSESTree.ClassDeclaration): boolean {
      // Simple check: look for this.props usage
      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition') {
          const body = member.value.body;
          if (containsPropsAccess(body)) {
            return true;
          }
        }
      }
      return false;
    }

    function containsPropsAccess(node: TSESTree.Node | null | undefined, visited = new Set<TSESTree.Node>()): boolean {
      if (!node) return false;
      
      if (visited.has(node)) return false;
      visited.add(node);
      
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'ThisExpression' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'props'
      ) {
        return true;
      }

      // Skip non-child keys to avoid circular references
      const skipKeys = new Set(['parent', 'range', 'loc', 'start', 'end', 'tokens', 'comments']);
      
      for (const key in node) {
        if (skipKeys.has(key)) continue;
        
        const child = (node as Record<string, unknown>)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === 'object' && 'type' in item) {
                if (containsPropsAccess(item as TSESTree.Node, visited)) {
                  return true;
                }
              }
            }
          } else if ('type' in child) {
            if (containsPropsAccess(child as TSESTree.Node, visited)) {
              return true;
            }
          }
        }
      }

      return false;
    }
  },
});
