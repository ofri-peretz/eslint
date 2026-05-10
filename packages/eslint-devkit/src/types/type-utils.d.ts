/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Type Utilities - Helper functions for working with TypeScript types
 *
 * Inspired by typescript-eslint's type-utils
 * Provides utilities for type-aware linting rules
 */
import type { ParserServices, TSESTree } from '@typescript-eslint/utils';
import * as ts from 'typescript';
/**
 * Context type that can have parser services
 * Compatible with both ESLint 8 (context.parserServices) and ESLint 9 (context.sourceCode.parserServices)
 * Uses Partial<ParserServices> to be compatible with ESLint's RuleContext which uses Partial
 */
type ContextWithParserServices = {
    sourceCode?: {
        parserServices?: Partial<ParserServices>;
    };
    parserServices?: Partial<ParserServices>;
};
/**
 * Get the TypeScript Program from ESLint parser services
 *
 * @throws Error if parser services are not available
 */
export declare function getParserServices(context: ContextWithParserServices): ParserServices;
/**
 * Check if parser services are available without throwing
 */
export declare function hasParserServices(context: ContextWithParserServices): boolean;
/**
 * Get the TypeScript type of an ESTree node
 */
export declare function getTypeOfNode(node: TSESTree.Node, parserServices: ParserServices): ts.Type;
/**
 * Check if a type is any type
 */
export declare function isAnyType(type: ts.Type): boolean;
/**
 * Check if a type is unknown type
 */
export declare function isUnknownType(type: ts.Type): boolean;
/**
 * Check if a type is never type
 */
export declare function isNeverType(type: ts.Type): boolean;
/**
 * Check if a type is null or undefined
 */
export declare function isNullableType(type: ts.Type): boolean;
/**
 * Check if a type is a string type
 */
export declare function isStringType(type: ts.Type): boolean;
/**
 * Check if a type is a number type
 */
export declare function isNumberType(type: ts.Type): boolean;
/**
 * Check if a type is a boolean type
 */
export declare function isBooleanType(type: ts.Type): boolean;
/**
 * Check if a type is an array type
 */
export declare function isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean;
/**
 * Check if a type is a promise type
 */
export declare function isPromiseType(type: ts.Type): boolean;
/**
 * Get the type arguments of a generic type
 */
export declare function getTypeArguments(type: ts.Type, checker: ts.TypeChecker): readonly ts.Type[];
/**
 * Check if a type satisfies a predicate (including union types)
 */
export declare function typeMatchesPredicateRecursive(type: ts.Type, predicate: (type: ts.Type) => boolean): boolean;
/**
 * Check if a type is a string literal type (e.g., 'name', 'email')
 *
 * This is useful for detecting statically constrained property keys
 * that are safe from object injection attacks.
 */
export declare function isStringLiteralType(type: ts.Type): boolean;
/**
 * Check if a type is a number literal type (e.g., 1, 2, 3)
 */
export declare function isNumberLiteralType(type: ts.Type): boolean;
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
export declare function isUnionOfLiterals(type: ts.Type): boolean;
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
export declare function isUnionOfStringLiterals(type: ts.Type): boolean;
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
export declare function getStringLiteralValues(type: ts.Type): string[] | null;
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
export declare function isUnionOfSafeStringLiterals(type: ts.Type, dangerousProperties?: string[]): boolean;
export {};
