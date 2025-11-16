/**
 * AST Utilities - Helper functions for working with ESTree/TSESTree nodes
 * 
 * Inspired by typescript-eslint's ast-utils
 * Provides common utilities for traversing and analyzing AST nodes
 */
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Check if a node is a specific type of node
 */
export function isNodeOfType<T extends TSESTree.Node['type']>(
  node: TSESTree.Node | null | undefined,
  type: T
): node is Extract<TSESTree.Node, { type: T }> {
  return node?.type === type;
}

/**
 * Check if a node is a function-like node
 */
export function isFunctionNode(
  node: TSESTree.Node | null | undefined
): node is
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression {
  if (!node) return false;
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Check if a node is a class-like node
 */
export function isClassNode(
  node: TSESTree.Node | null | undefined
): node is TSESTree.ClassDeclaration | TSESTree.ClassExpression {
  if (!node) return false;
  return node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
}

/**
 * Check if a node is a member expression accessing a specific property
 * 
 * @example
 * ```typescript
 * // Matches: console.log
 * isMemberExpression(node, 'console', 'log')
 * 
 * // Matches: foo.bar.baz
 * isMemberExpression(node, ['foo', 'bar'], 'baz')
 * ```
 */
export function isMemberExpression(
  node: TSESTree.Node | null | undefined,
  objectName: string | string[],
  propertyName?: string
): node is TSESTree.MemberExpression {
  if (!node || node.type !== 'MemberExpression') {
    return false;
  }

  const names = Array.isArray(objectName) ? objectName : [objectName];
  
  // For nested paths like ['foo', 'bar'], we need to check that
  // node.object matches the path foo.bar
  // For 'foo.bar.baz', node.object should be the MemberExpression for 'foo.bar'
  if (names.length > 1) {
    // Build the expected chain by traversing backwards
    // For ['foo', 'bar'], we expect: Identifier('foo').Identifier('bar')
  let current: TSESTree.Node = node.object;
    
    // Check from the last name to the first
  for (let i = names.length - 1; i >= 0; i--) {
      if (i === 0) {
        // First name should be an Identifier
        if (current.type !== 'Identifier' || current.name !== names[0]) {
          return false;
        }
      } else {
        // Other names should be properties of MemberExpressions
        if (current.type !== 'MemberExpression') {
      return false;
    }
        if (current.property.type !== 'Identifier' || current.property.name !== names[i]) {
        return false;
      }
        current = current.object;
      }
    }
  } else {
    // Simple case: single object name
    if (node.object.type !== 'Identifier' || node.object.name !== names[0]) {
      return false;
    }
  }

  // Check property if specified
  if (propertyName !== undefined) {
    if (node.property.type !== 'Identifier' || node.property.name !== propertyName) {
      return false;
    }
  }

  return true;
}

/**
 * Get the identifier name from a node if it's an identifier
 */
export function getIdentifierName(
  node: TSESTree.Node | null | undefined
): string | null {
  if (!node || node.type !== 'Identifier') {
    return null;
  }
  return node.name;
}

/**
 * Check if a node is a call expression to a specific function
 * 
 * @example
 * ```typescript
 * // Matches: console.log()
 * isCallExpression(node, 'console', 'log')
 * 
 * // Matches: myFunction()
 * isCallExpression(node, 'myFunction')
 * ```
 */
export function isCallExpression(
  node: TSESTree.Node | null | undefined,
  objectName?: string,
  methodName?: string
): node is TSESTree.CallExpression {
  if (!node || node.type !== 'CallExpression') {
    return false;
  }

  if (!objectName) {
    return true;
  }

  if (methodName) {
    return isMemberExpression(node.callee, objectName, methodName);
  }

  return getIdentifierName(node.callee) === objectName;
}

/**
 * Get the name of a function node
 */
export function getFunctionName(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression
): string | null {
  return node.id?.name ?? null;
}

/**
 * Check if a node is inside a specific type of parent node
 */
export function isInsideNode<T extends TSESTree.Node['type']>(
  node: TSESTree.Node,
  parentType: T,
  ancestors: TSESTree.Node[]
): boolean {
  return ancestors.some((ancestor) => ancestor.type === parentType);
}

/**
 * Get the first ancestor of a specific type
 */
export function getAncestorOfType<T extends TSESTree.Node['type']>(
  type: T,
  ancestors: TSESTree.Node[]
): Extract<TSESTree.Node, { type: T }> | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor.type === type) {
      return ancestor as Extract<TSESTree.Node, { type: T }>;
    }
  }
  return null;
}

/**
 * Check if a node is a literal value
 */
export function isLiteral(
  node: TSESTree.Node | null | undefined
): node is TSESTree.Literal {
  return node?.type === 'Literal';
}

/**
 * Check if a node is a template literal
 */
export function isTemplateLiteral(
  node: TSESTree.Node | null | undefined
): node is TSESTree.TemplateLiteral {
  return node?.type === 'TemplateLiteral';
}

/**
 * Get the static value of a node if it's a literal
 */
export function getStaticValue(
  node: TSESTree.Node | null | undefined
): string | number | boolean | RegExp | bigint | null | undefined {
  if (!node) {
    return undefined;
  }

  if (isLiteral(node)) {
    return node.value;
  }

  if (isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }

  return undefined;
}
