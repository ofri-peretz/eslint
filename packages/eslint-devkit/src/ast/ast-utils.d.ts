/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
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
export declare function isNodeOfType<T extends TSESTree.Node['type']>(node: TSESTree.Node | null | undefined, type: T): node is Extract<TSESTree.Node, {
    type: T;
}>;
/**
 * Check if a node is a function-like node
 */
export declare function isFunctionNode(node: TSESTree.Node | null | undefined): node is TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
/**
 * Check if a node is a class-like node
 */
export declare function isClassNode(node: TSESTree.Node | null | undefined): node is TSESTree.ClassDeclaration | TSESTree.ClassExpression;
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
export declare function isMemberExpression(node: TSESTree.Node | null | undefined, objectName: string | string[], propertyName?: string): node is TSESTree.MemberExpression;
/**
 * Get the identifier name from a node if it's an identifier
 */
export declare function getIdentifierName(node: TSESTree.Node | null | undefined): string | null;
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
export declare function isCallExpression(node: TSESTree.Node | null | undefined, objectName?: string, methodName?: string): node is TSESTree.CallExpression;
/**
 * Get the name of a function node
 */
export declare function getFunctionName(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression): string | null;
/**
 * Check if a node is inside a specific type of parent node
 */
export declare function isInsideNode<T extends TSESTree.Node['type']>(node: TSESTree.Node, parentType: T, ancestors: TSESTree.Node[]): boolean;
/**
 * Get the first ancestor of a specific type
 */
export declare function getAncestorOfType<T extends TSESTree.Node['type']>(type: T, ancestors: TSESTree.Node[]): Extract<TSESTree.Node, {
    type: T;
}> | null;
/**
 * Check if a node is a literal value
 */
export declare function isLiteral(node: TSESTree.Node | null | undefined): node is TSESTree.Literal;
/**
 * Check if a node is a template literal
 */
export declare function isTemplateLiteral(node: TSESTree.Node | null | undefined): node is TSESTree.TemplateLiteral;
/**
 * Get the static value of a node if it's a literal
 */
export declare function getStaticValue(node: TSESTree.Node | null | undefined): string | number | boolean | RegExp | bigint | null | undefined;
/**
 * Extract function signature for documentation
 */
export declare function extractFunctionSignature(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): string;
