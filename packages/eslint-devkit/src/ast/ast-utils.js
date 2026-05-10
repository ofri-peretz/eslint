"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeOfType = isNodeOfType;
exports.isFunctionNode = isFunctionNode;
exports.isClassNode = isClassNode;
exports.isMemberExpression = isMemberExpression;
exports.getIdentifierName = getIdentifierName;
exports.isCallExpression = isCallExpression;
exports.getFunctionName = getFunctionName;
exports.isInsideNode = isInsideNode;
exports.getAncestorOfType = getAncestorOfType;
exports.isLiteral = isLiteral;
exports.isTemplateLiteral = isTemplateLiteral;
exports.getStaticValue = getStaticValue;
exports.extractFunctionSignature = extractFunctionSignature;
/**
 * Check if a node is a specific type of node
 */
function isNodeOfType(node, type) {
    return node?.type === type;
}
/**
 * Check if a node is a function-like node
 */
function isFunctionNode(node) {
    if (!node)
        return false;
    return (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression');
}
/**
 * Check if a node is a class-like node
 */
function isClassNode(node) {
    if (!node)
        return false;
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
function isMemberExpression(node, objectName, propertyName) {
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
        let current = node.object;
        // Check from the last name to the first
        for (let i = names.length - 1; i >= 0; i--) {
            if (i === 0) {
                // First name should be an Identifier
                if (current.type !== 'Identifier' || current.name !== names[0]) {
                    return false;
                }
            }
            else {
                // Other names should be properties of MemberExpressions
                if (current.type !== 'MemberExpression') {
                    return false;
                }
                if (current.property.type !== 'Identifier' ||
                    current.property.name !== names[i]) {
                    return false;
                }
                current = current.object;
            }
        }
    }
    else {
        // Simple case: single object name
        if (node.object.type !== 'Identifier' || node.object.name !== names[0]) {
            return false;
        }
    }
    // Check property if specified
    if (propertyName !== undefined) {
        if (node.property.type !== 'Identifier' ||
            node.property.name !== propertyName) {
            return false;
        }
    }
    return true;
}
/**
 * Get the identifier name from a node if it's an identifier
 */
function getIdentifierName(node) {
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
function isCallExpression(node, objectName, methodName) {
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
function getFunctionName(node) {
    return node.id?.name ?? null;
}
/**
 * Check if a node is inside a specific type of parent node
 */
function isInsideNode(node, parentType, ancestors) {
    return ancestors.some((ancestor) => ancestor.type === parentType);
}
/**
 * Get the first ancestor of a specific type
 */
function getAncestorOfType(type, ancestors) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor.type === type) {
            return ancestor;
        }
    }
    return null;
}
/**
 * Check if a node is a literal value
 */
function isLiteral(node) {
    return node?.type === 'Literal';
}
/**
 * Check if a node is a template literal
 */
function isTemplateLiteral(node) {
    return node?.type === 'TemplateLiteral';
}
/**
 * Get the static value of a node if it's a literal
 */
function getStaticValue(node) {
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
/**
 * Extract function signature for documentation
 */
function extractFunctionSignature(node) {
    const params = node.params
        .map((param) => {
        if (param.type === 'Identifier') {
            return param.name;
        }
        return '...';
    })
        .join(', ');
    if (node.type === 'FunctionDeclaration' && node.id) {
        return `function ${node.id.name}(${params})`;
    }
    return `(${params}) => {...}`;
}
