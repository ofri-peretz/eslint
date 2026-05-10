"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParserServices = getParserServices;
exports.hasParserServices = hasParserServices;
exports.getTypeOfNode = getTypeOfNode;
exports.isAnyType = isAnyType;
exports.isUnknownType = isUnknownType;
exports.isNeverType = isNeverType;
exports.isNullableType = isNullableType;
exports.isStringType = isStringType;
exports.isNumberType = isNumberType;
exports.isBooleanType = isBooleanType;
exports.isArrayType = isArrayType;
exports.isPromiseType = isPromiseType;
exports.getTypeArguments = getTypeArguments;
exports.typeMatchesPredicateRecursive = typeMatchesPredicateRecursive;
exports.isStringLiteralType = isStringLiteralType;
exports.isNumberLiteralType = isNumberLiteralType;
exports.isUnionOfLiterals = isUnionOfLiterals;
exports.isUnionOfStringLiterals = isUnionOfStringLiterals;
exports.getStringLiteralValues = getStringLiteralValues;
exports.isUnionOfSafeStringLiterals = isUnionOfSafeStringLiterals;
const tslib_1 = require("tslib");
const ts = tslib_1.__importStar(require("typescript"));
/**
 * Get the TypeScript Program from ESLint parser services
 *
 * @throws Error if parser services are not available
 */
function getParserServices(context) {
    // Handle both ESLint 8 and ESLint 9 contexts
    const parserServices = context.sourceCode?.parserServices ?? context.parserServices;
    if (!parserServices ||
        !parserServices.program ||
        !parserServices.esTreeNodeToTSNodeMap) {
        throw new Error('You have used a rule which requires parserServices to be generated. ' +
            'You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.');
    }
    // At this point we've verified the required properties exist, safe to cast
    return parserServices;
}
/**
 * Check if parser services are available without throwing
 */
function hasParserServices(context) {
    const parserServices = context.sourceCode?.parserServices ?? context.parserServices;
    return !!(parserServices &&
        parserServices.program &&
        parserServices.esTreeNodeToTSNodeMap);
}
/**
 * Get the TypeScript type of an ESTree node
 */
function getTypeOfNode(node, parserServices) {
    const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
    const program = parserServices.program;
    if (!program) {
        throw new Error('Program is not available');
    }
    const checker = program.getTypeChecker();
    return checker.getTypeAtLocation(tsNode);
}
/**
 * Check if a type is any type
 */
function isAnyType(type) {
    if (type.flags & ts.TypeFlags.Any) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.some(isAnyType);
    }
    return false;
}
/**
 * Check if a type is unknown type
 */
function isUnknownType(type) {
    if (type.flags & ts.TypeFlags.Unknown) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.some(isUnknownType);
    }
    return false;
}
/**
 * Check if a type is never type
 */
function isNeverType(type) {
    return (type.flags & ts.TypeFlags.Never) !== 0;
}
/**
 * Check if a type is null or undefined
 */
function isNullableType(type) {
    if (type.isUnion()) {
        return type.types.some((t) => (t.flags & ts.TypeFlags.Null) !== 0 ||
            (t.flags & ts.TypeFlags.Undefined) !== 0);
    }
    return ((type.flags & ts.TypeFlags.Null) !== 0 ||
        (type.flags & ts.TypeFlags.Undefined) !== 0);
}
/**
 * Check if a type is a string type
 */
function isStringType(type) {
    if (type.flags & ts.TypeFlags.String) {
        return true;
    }
    if (type.flags & ts.TypeFlags.StringLiteral) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.every(isStringType);
    }
    return false;
}
/**
 * Check if a type is a number type
 */
function isNumberType(type) {
    if (type.flags & ts.TypeFlags.Number) {
        return true;
    }
    if (type.flags & ts.TypeFlags.NumberLiteral) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.every(isNumberType);
    }
    return false;
}
/**
 * Check if a type is a boolean type
 */
function isBooleanType(type) {
    if (type.flags & ts.TypeFlags.Boolean) {
        return true;
    }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.every(isBooleanType);
    }
    return false;
}
/**
 * Check if a type is an array type
 */
function isArrayType(type, checker) {
    const symbol = type.getSymbol();
    if (!symbol) {
        return false;
    }
    return symbol.getName() === 'Array' && checker.isArrayType(type);
}
/**
 * Check if a type is a promise type
 */
function isPromiseType(type) {
    const symbol = type.getSymbol();
    if (!symbol) {
        return false;
    }
    return symbol.getName() === 'Promise';
}
/**
 * Get the type arguments of a generic type
 */
function getTypeArguments(type, checker) {
    if (checker.isArrayType?.(type)) {
        return checker.getTypeArguments(type);
    }
    const typeArgs = type.typeArguments;
    if (typeArgs) {
        return typeArgs;
    }
    return [];
}
/**
 * Check if a type satisfies a predicate (including union types)
 */
function typeMatchesPredicateRecursive(type, predicate) {
    if (predicate(type)) {
        return true;
    }
    if (type.isUnion()) {
        return type.types.some((t) => typeMatchesPredicateRecursive(t, predicate));
    }
    if (type.isIntersection()) {
        return type.types.every((t) => typeMatchesPredicateRecursive(t, predicate));
    }
    return false;
}
/**
 * Check if a type is a string literal type (e.g., 'name', 'email')
 *
 * This is useful for detecting statically constrained property keys
 * that are safe from object injection attacks.
 */
function isStringLiteralType(type) {
    return (type.flags & ts.TypeFlags.StringLiteral) !== 0;
}
/**
 * Check if a type is a number literal type (e.g., 1, 2, 3)
 */
function isNumberLiteralType(type) {
    return (type.flags & ts.TypeFlags.NumberLiteral) !== 0;
}
/**
 * Check if a type is a union of only literal types (string, number, or boolean literals)
 *
 * This is the key function for type-aware security rules.
 * A union like 'name' | 'email' is statically constrained and safe,
 * while string | number could be any value at runtime.
 *
 * @example
 * // Returns true - safe, statically constrained:
 * type Key = 'name' | 'email' | 'age';
 *
 * // Returns false - unsafe, could be any string:
 * type Key = string;
 * type Key = string | number;
 * type Key = 'name' | string; // string absorbs the literal
 */
function isUnionOfLiterals(type) {
    // Single literal type
    if (isStringLiteralType(type) || isNumberLiteralType(type)) {
        return true;
    }
    // Boolean literal (true | false)
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
        return true;
    }
    // Union type - check if ALL members are literals
    if (type.isUnion()) {
        return type.types.every((t) => {
            // Each type in the union must be a literal
            return ((t.flags & ts.TypeFlags.StringLiteral) !== 0 ||
                (t.flags & ts.TypeFlags.NumberLiteral) !== 0 ||
                (t.flags & ts.TypeFlags.BooleanLiteral) !== 0);
        });
    }
    return false;
}
/**
 * Check if a type is a union of only string literals
 *
 * More specific version of isUnionOfLiterals that only allows string literals.
 * This is useful for property key validation where only string keys are expected.
 *
 * @example
 * // Returns true:
 * type Key = 'name' | 'email';
 *
 * // Returns false:
 * type Key = 'name' | 1; // has number literal
 * type Key = string;
 */
function isUnionOfStringLiterals(type) {
    // Single string literal
    if (isStringLiteralType(type)) {
        return true;
    }
    // Union type - check if ALL members are string literals
    if (type.isUnion()) {
        return type.types.every((t) => isStringLiteralType(t));
    }
    return false;
}
/**
 * Get the literal values from a union of string literals
 *
 * Extracts the actual string values from a type like 'name' | 'email'
 * Returns null if the type is not a union of string literals.
 *
 * @example
 * // For type 'name' | 'email':
 * getStringLiteralValues(type) // ['name', 'email']
 *
 * // For type string:
 * getStringLiteralValues(type) // null
 */
function getStringLiteralValues(type) {
    // Single string literal
    if (isStringLiteralType(type)) {
        const literalType = type;
        if (typeof literalType.value === 'string') {
            return [literalType.value];
        }
        return null;
    }
    // Union type - extract all string literal values
    if (type.isUnion()) {
        const values = [];
        for (const t of type.types) {
            if (!isStringLiteralType(t)) {
                return null; // Not all members are string literals
            }
            const literalType = t;
            if (typeof literalType.value === 'string') {
                values.push(literalType.value);
            }
        }
        return values.length > 0 ? values : null;
    }
    return null;
}
/**
 * Check if a union of string literals contains any dangerous property names
 *
 * Even if a type is constrained to string literals, it could still be dangerous
 * if it includes properties like '__proto__', 'constructor', or 'prototype'.
 *
 * @param type - The TypeScript type to check
 * @param dangerousProperties - List of dangerous property names (defaults to common prototype pollution vectors)
 * @returns true if the type is safe (no dangerous properties), false otherwise
 */
function isUnionOfSafeStringLiterals(type, dangerousProperties = ['__proto__', 'prototype', 'constructor']) {
    const values = getStringLiteralValues(type);
    if (!values) {
        return false; // Not a union of string literals
    }
    // Check if any literal value is dangerous
    return !values.some((value) => dangerousProperties.includes(value));
}
