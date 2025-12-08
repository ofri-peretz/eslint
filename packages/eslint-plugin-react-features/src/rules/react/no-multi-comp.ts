/**
 * ESLint Rule: no-multi-comp
 * Prevent multiple components per file
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noMultiComp';

export interface Options {
  ignoreStateless?: boolean;
}

type RuleOptions = [Options?];

export const noMultiComp = createRule<RuleOptions, MessageIds>({
  name: 'no-multi-comp',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent multiple components per file',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreStateless: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noMultiComp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Multiple Components',
        description: 'Multiple components defined in single file',
        severity: 'LOW',
        fix: 'Extract components to separate files',
        documentationLink: 'https://react.dev/learn/thinking-in-react#step-3-identify-where-your-state-should-live',
      }),
    },
  },
  defaultOptions: [{ ignoreStateless: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const components: TSESTree.Node[] = [];

    return {
      // Class components
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) {
          components.push(node);
        }
      },

      // Function components
      'VariableDeclarator, FunctionDeclaration'(node: TSESTree.VariableDeclarator | TSESTree.FunctionDeclaration) {
        if (isReactComponentFunction(getComponentFromDeclaration(node))) {
          components.push(node);
        }
      },

      'Program:exit'() {
        const [firstOption] = context.options;
        const ignoreStateless = firstOption?.ignoreStateless ?? false;

        let componentCount = components.length;

        if (ignoreStateless) {
          // Count only stateful components
          componentCount = components.filter(comp => !isStatelessComponent(comp)).length;
        }

        if (componentCount > 1) {
          // Report on all components except the first
          for (let i = 1; i < components.length; i++) {
            const comp = components[i];
            if (!ignoreStateless || !isStatelessComponent(comp)) {
              context.report({
                node: getComponentNameNode(comp),
                messageId: 'noMultiComp',
              });
            }
          }
        }
      },
    };

    function getComponentFromDeclaration(node: TSESTree.VariableDeclarator | TSESTree.FunctionDeclaration): TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | null {
      if (node.type === 'FunctionDeclaration') {
        return node;
      }

      if (node.type === 'VariableDeclarator' && node.init) {
        if (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') {
          return node.init;
        }
      }

      return null;
    }

    function isReactComponentFunction(node: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | null): boolean {
      if (!node) return false;
      const body = node.type === 'FunctionDeclaration' ? node.body : node.body;
      return containsJSX(body);
    }

    function containsJSX(node: TSESTree.Node | null | undefined, visited = new Set<TSESTree.Node>()): boolean {
      if (!node) return false;
      
      if (visited.has(node)) return false;
      visited.add(node);
      
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
        return true;
      }

      // Skip non-child keys to avoid circular references
      const skipKeys = new Set(['parent', 'range', 'loc', 'start', 'end', 'tokens', 'comments']);
      
      for (const key in node) {
        if (skipKeys.has(key)) continue;
        
        const child = (node as unknown as Record<string, unknown>)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === 'object' && 'type' in item) {
                if (containsJSX(item as TSESTree.Node, visited)) {
                  return true;
                }
              }
            }
          } else if ('type' in child) {
            if (containsJSX(child as TSESTree.Node, visited)) {
              return true;
            }
          }
        }
      }

      return false;
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

    function isStatelessComponent(node: TSESTree.Node): boolean {
      // Simple heuristic: check if it's a function component without useState
      return !isReactComponent(node as TSESTree.ClassDeclaration);
    }

    function getComponentNameNode(node: TSESTree.Node): TSESTree.Node {
      if (node.type === 'ClassDeclaration') {
        return node.id || node;
      }
      if (node.type === 'FunctionDeclaration') {
        return node.id || node;
      }
      if (node.type === 'VariableDeclarator') {
        return node.id || node;
      }
      return node;
    }
  },
});
