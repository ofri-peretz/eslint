/**
 * ESLint Rule: display-name
 * Enforce component display names
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'displayName';

export const displayName = createRule<[], MessageIds>({
  name: 'display-name',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce component display names',
    },
    messages: {
      displayName: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Display Name',
        description: 'Component missing display name',
        severity: 'LOW',
        fix: 'Add displayName static property or named export',
        documentationLink: 'https://react.dev/learn/components-and-props#displaying-a-custom-component',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Check class components
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (isReactComponent(node)) {
          const hasDisplayName = hasDisplayNameProperty(node);
          if (!hasDisplayName) {
            context.report({
              node: node.id || node,
              messageId: 'displayName',
            });
          }
        }
      },

      // Check function components
      'VariableDeclarator, FunctionDeclaration'(node: TSESTree.VariableDeclarator | TSESTree.FunctionDeclaration) {
        const component = getComponentFromDeclaration(node);
        if (component && isReactComponentFunction(component) && !hasDisplayNameInScope(component)) {
          context.report({
            node: getComponentNameNode(node),
            messageId: 'displayName',
          });
        }
      },
    };
  },
});

/**
 * Check if class declaration is a React component
 */
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

/**
 * Check if class has displayName property
 */
function hasDisplayNameProperty(node: TSESTree.ClassDeclaration): boolean {
  for (const member of node.body.body) {
    if (
      (member.type === 'PropertyDefinition' || member.type === 'ClassProperty') &&
      member.key.type === 'Identifier' &&
      member.key.name === 'displayName' &&
      member.static
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get component from declaration
 */
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

/**
 * Check if function is a React component
 */
function isReactComponentFunction(node: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration): boolean {
  // Simple heuristic: check if function returns JSX or contains JSX
  const body = node.type === 'FunctionDeclaration' ? node.body : node.body;
  return containsJSX(body);
}

/**
 * Check if component has displayName in scope
 */
function hasDisplayNameInScope(node: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration): boolean {
   
  // Check for assignment to displayName after component declaration
  // This is a simplified check - in practice, you'd want to check the scope
  return false; // For now, always require explicit displayName
}

/**
 * Get component name node for reporting
 */
function getComponentNameNode(node: TSESTree.VariableDeclarator | TSESTree.FunctionDeclaration): TSESTree.Node {
  if (node.type === 'FunctionDeclaration') {
    return node.id || node;
  }
  return node.id || node;
}

/**
 * Check if node contains JSX
 */
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
