/**
 * Type Utilities - Helper functions for working with TypeScript types
 * 
 * Inspired by typescript-eslint's type-utils
 * Provides utilities for type-aware linting rules
 */
import type { ParserServices, TSESTree } from '@typescript-eslint/utils';
import * as ts from 'typescript';


/**
 * Get the TypeScript Program from ESLint parser services
 * 
 * @throws Error if parser services are not available
 */
export function getParserServices(context: {
  sourceCode?: { parserServices?: ParserServices };
  parserServices?: ParserServices;
}): ParserServices {
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
        'You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.'
    );
  }

  return parserServices;
}

/**
 * Check if parser services are available without throwing
 */
export function hasParserServices(context: {
  sourceCode?: { parserServices?: ParserServices };
  parserServices?: ParserServices;
}): boolean {
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
  parserServices: ParserServices
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
        (t.flags & ts.TypeFlags.Undefined) !== 0
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
export function isArrayType(
  type: ts.Type,
  checker: ts.TypeChecker
): boolean {
  const symbol = type.getSymbol();
  if (!symbol) {
    return false;
  }

  return (
    symbol.getName() === 'Array' &&
    checker.isArrayType(type)
  );
}

/**
 * Check if a type is a promise type
 */
export function isPromiseType(
  type: ts.Type,
): boolean {
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
  checker: ts.TypeChecker
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
  predicate: (type: ts.Type) => boolean
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
