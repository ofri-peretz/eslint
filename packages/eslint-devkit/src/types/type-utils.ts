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
  sourceCode?: { parserServices?: Partial<ParserServices> };
  parserServices?: Partial<ParserServices>;
};

/**
 * Get the TypeScript Program from ESLint parser services
 *
 * @throws Error if parser services are not available
 */
export function getParserServices(
  context: ContextWithParserServices,
): ParserServices {
  // Handle both ESLint 8 and ESLint 9 contexts
  const parserServices =
    context.sourceCode?.parserServices ?? context.parserServices;

  if (
    !parserServices ||
    !parserServices.program ||
    !parserServices.esTreeNodeToTSNodeMap
  ) {
    throw new Error(
      'You have used a rule which requires parserServices to be generated. ' +
        'You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.',
    );
  }

  // At this point we've verified the required properties exist, safe to cast
  return parserServices as ParserServices;
}

/**
 * Check if parser services are available without throwing
 */
export function hasParserServices(context: ContextWithParserServices): boolean {
  const parserServices =
    context.sourceCode?.parserServices ?? context.parserServices;

  return !!(
    parserServices &&
    parserServices.program &&
    parserServices.esTreeNodeToTSNodeMap
  );
}

/**
 * Get the TypeScript type of an ESTree node
 */
export function getTypeOfNode(
  node: TSESTree.Node,
  parserServices: ParserServices,
): ts.Type {
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
export function isAnyType(type: ts.Type): boolean {
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
export function isUnknownType(type: ts.Type): boolean {
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
export function isNeverType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Never) !== 0;
}

/**
 * Check if a type is null or undefined
 */
export function isNullableType(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.some(
      (t) =>
        (t.flags & ts.TypeFlags.Null) !== 0 ||
        (t.flags & ts.TypeFlags.Undefined) !== 0,
    );
  }

  return (
    (type.flags & ts.TypeFlags.Null) !== 0 ||
    (type.flags & ts.TypeFlags.Undefined) !== 0
  );
}

/**
 * Check if a type is a string type
 */
export function isStringType(type: ts.Type): boolean {
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
export function isNumberType(type: ts.Type): boolean {
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
export function isBooleanType(type: ts.Type): boolean {
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
export function isArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const symbol = type.getSymbol();
  if (!symbol) {
    return false;
  }

  return symbol.getName() === 'Array' && checker.isArrayType(type);
}

/**
 * Check if a type is a promise type
 */
export function isPromiseType(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  if (!symbol) {
    return false;
  }

  return symbol.getName() === 'Promise';
}

/**
 * Get the type arguments of a generic type
 */
export function getTypeArguments(
  type: ts.Type,
  checker: ts.TypeChecker,
): readonly ts.Type[] {
  if (checker.isArrayType?.(type)) {
    return checker.getTypeArguments(type as ts.TypeReference);
  }

  const typeArgs = (type as ts.TypeReference).typeArguments;
  if (typeArgs) {
    return typeArgs;
  }

  return [];
}

/**
 * Check if a type satisfies a predicate (including union types)
 */
export function typeMatchesPredicateRecursive(
  type: ts.Type,
  predicate: (type: ts.Type) => boolean,
): boolean {
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
export function isStringLiteralType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.StringLiteral) !== 0;
}

/**
 * Check if a type is a number literal type (e.g., 1, 2, 3)
 */
export function isNumberLiteralType(type: ts.Type): boolean {
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
export function isUnionOfLiterals(type: ts.Type): boolean {
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
      return (
        (t.flags & ts.TypeFlags.StringLiteral) !== 0 ||
        (t.flags & ts.TypeFlags.NumberLiteral) !== 0 ||
        (t.flags & ts.TypeFlags.BooleanLiteral) !== 0
      );
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
export function isUnionOfStringLiterals(type: ts.Type): boolean {
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
export function getStringLiteralValues(type: ts.Type): string[] | null {
  // Single string literal
  if (isStringLiteralType(type)) {
    const literalType = type as ts.LiteralType;
    if (typeof literalType.value === 'string') {
      return [literalType.value];
    }
    return null;
  }

  // Union type - extract all string literal values
  if (type.isUnion()) {
    const values: string[] = [];
    for (const t of type.types) {
      if (!isStringLiteralType(t)) {
        return null; // Not all members are string literals
      }
      const literalType = t as ts.LiteralType;
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
export function isUnionOfSafeStringLiterals(
  type: ts.Type,
  dangerousProperties: string[] = ['__proto__', 'prototype', 'constructor'],
): boolean {
  const values = getStringLiteralValues(type);
  if (!values) {
    return false; // Not a union of string literals
  }

  // Check if any literal value is dangerous
  return !values.some((value) => dangerousProperties.includes(value));
}
