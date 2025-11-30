/**
 * Comprehensive tests for Type utilities
 * Tests helper functions for working with TypeScript types
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ts from 'typescript';
import type { ParserServices, TSESTree } from '@typescript-eslint/utils';
import {
  getParserServices,
  hasParserServices,
  getTypeOfNode,
  isAnyType,
  isUnknownType,
  isNeverType,
  isNullableType,
  isStringType,
  isNumberType,
  isBooleanType,
  isArrayType,
  isPromiseType,
  getTypeArguments,
  typeMatchesPredicateRecursive,
  isStringLiteralType,
  isNumberLiteralType,
  isUnionOfLiterals,
  isUnionOfStringLiterals,
  getStringLiteralValues,
  isUnionOfSafeStringLiterals,
} from './type-utils';

describe('getParserServices', () => {
  const mockParserServices = {
    program: {} as ts.Program,
    esTreeNodeToTSNodeMap: new Map(),
    tsNodeToESTreeNodeMap: new Map(),
  } as unknown as ParserServices;

  it('should return parser services from sourceCode.parserServices (ESLint 9)', () => {
    const context = {
      sourceCode: {
        parserServices: mockParserServices,
      },
    };

    const result = getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices });
    expect(result).toBe(mockParserServices);
  });

  it('should return parser services from parserServices (ESLint 8)', () => {
    const context = {
      parserServices: mockParserServices,
    };

    const result = getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices });
    expect(result).toBe(mockParserServices);
  });

  it('should prefer sourceCode.parserServices over parserServices', () => {
    const es9Services = { ...mockParserServices };
    const es8Services = { ...mockParserServices };
    
    const context = {
      sourceCode: {
        parserServices: es9Services,
      },
      parserServices: es8Services,
    };

    const result = getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices });
    expect(result).toBe(es9Services);
  });

  it('should throw error when parserServices is missing', () => {
    const context = {};

    expect(() => getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toThrow(
      'You have used a rule which requires parserServices to be generated'
    );
  });

  it('should throw error when program is missing', () => {
    const context = {
      parserServices: {
        esTreeNodeToTSNodeMap: new Map(),
      },
    };

    expect(() => getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toThrow();
  });

  it('should throw error when esTreeNodeToTSNodeMap is missing', () => {
    const context = {
      parserServices: {
        program: {} as ts.Program,
      },
    };

    expect(() => getParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toThrow();
  });
});

describe('hasParserServices', () => {
  const mockParserServices = {
    program: {} as ts.Program,
    esTreeNodeToTSNodeMap: new Map(),
    tsNodeToESTreeNodeMap: new Map(),
  } as unknown as ParserServices;

  it('should return true when parser services are available (ESLint 9)', () => {
    const context = {
      sourceCode: {
        parserServices: mockParserServices,
      },
    };

    expect(hasParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toBe(true);
  });

  it('should return true when parser services are available (ESLint 8)', () => {
    const context = {
      parserServices: mockParserServices,
    };

    expect(hasParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toBe(true);
  });

  it('should return false when parserServices is missing', () => {
    const context = {};

    expect(hasParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toBe(false);
  });

  it('should return false when program is missing', () => {
    const context = {
      parserServices: {
        esTreeNodeToTSNodeMap: new Map(),
      },
    };

    expect(hasParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toBe(false);
  });

  it('should return false when esTreeNodeToTSNodeMap is missing', () => {
    const context = {
      parserServices: {
        program: {} as ts.Program,
      },
    };

    expect(hasParserServices(context as unknown as { sourceCode?: { parserServices?: ParserServices }; parserServices?: ParserServices })).toBe(false);
  });
});

describe('getTypeOfNode', () => {
  let mockProgram: ts.Program;
  let mockChecker: ts.TypeChecker;
  let mockTsNode: ts.Node;
  let mockType: ts.Type;
  let mockParserServices: ParserServices;
  let testNode: TSESTree.Node;

  beforeEach(() => {
    mockType = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    testNode = {} as TSESTree.Node;
    mockTsNode = {} as ts.Node;

    mockChecker = {
      getTypeAtLocation: vi.fn().mockReturnValue(mockType),
    } as unknown as ts.TypeChecker;

    mockProgram = {
      getTypeChecker: vi.fn().mockReturnValue(mockChecker),
    } as unknown as ts.Program;

    const map = new Map<TSESTree.Node, ts.Node>();
    map.set(testNode, mockTsNode);

    mockParserServices = {
      program: mockProgram,
      esTreeNodeToTSNodeMap: map as ParserServices['esTreeNodeToTSNodeMap'],
      tsNodeToESTreeNodeMap: new Map(),
    } as unknown as ParserServices;
  });

  it('should get type from TypeScript checker', () => {
    // Use the testNode directly since WeakMaps don't have keys() method
    const result = getTypeOfNode(testNode, mockParserServices);

    expect(mockProgram.getTypeChecker).toHaveBeenCalled();
    expect(mockChecker.getTypeAtLocation).toHaveBeenCalledWith(mockTsNode);
    expect(result).toBe(mockType);
  });

  it('should throw error when program is not available', () => {
    const node = {} as TSESTree.Node;
    const servicesWithoutProgram: Partial<ParserServices> & { program?: undefined } = {
      ...mockParserServices,
      program: undefined,
    };

    expect(() => getTypeOfNode(node, servicesWithoutProgram as ParserServices)).toThrow(
      'Program is not available'
    );
  });
});

describe('isAnyType', () => {
  it('should return true for any type', () => {
    const type = {
      flags: ts.TypeFlags.Any,
    } as ts.Type;

    expect(isAnyType(type)).toBe(true);
  });

  it('should return false for non-any type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isAnyType(type)).toBe(false);
  });

  it('should return true for union containing any', () => {
    const anyType = {
      flags: ts.TypeFlags.Any,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [anyType, stringType],
    } as unknown as ts.Type;

    expect(isAnyType(unionType)).toBe(true);
  });

  it('should return false for union without any', () => {
    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringType, numberType],
    } as unknown as ts.Type;

    expect(isAnyType(unionType)).toBe(false);
  });
});

describe('isUnknownType', () => {
  it('should return true for unknown type', () => {
    const type = {
      flags: ts.TypeFlags.Unknown,
    } as ts.Type;

    expect(isUnknownType(type)).toBe(true);
  });

  it('should return false for non-unknown type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnknownType(type)).toBe(false);
  });

  it('should return true for union containing unknown', () => {
    const unknownType = {
      flags: ts.TypeFlags.Unknown,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [unknownType, stringType],
    } as unknown as ts.Type;

    expect(isUnknownType(unionType)).toBe(true);
  });
});

describe('isNeverType', () => {
  it('should return true for never type', () => {
    const type = {
      flags: ts.TypeFlags.Never,
    } as ts.Type;

    expect(isNeverType(type)).toBe(true);
  });

  it('should return false for non-never type', () => {
    const type = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    expect(isNeverType(type)).toBe(false);
  });

  it('should return false when Never flag is not set', () => {
    const type = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    expect(isNeverType(type)).toBe(false);
  });
});

describe('isNullableType', () => {
  it('should return true for null type', () => {
    const type = {
      flags: ts.TypeFlags.Null,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isNullableType(type)).toBe(true);
  });

  it('should return true for undefined type', () => {
    const type = {
      flags: ts.TypeFlags.Undefined,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isNullableType(type)).toBe(true);
  });

  it('should return true for union containing null', () => {
    const nullType = {
      flags: ts.TypeFlags.Null,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [nullType, stringType],
    } as unknown as ts.Type;

    expect(isNullableType(unionType)).toBe(true);
  });

  it('should return true for union containing undefined', () => {
    const undefinedType = {
      flags: ts.TypeFlags.Undefined,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [undefinedType, stringType],
    } as unknown as ts.Type;

    expect(isNullableType(unionType)).toBe(true);
  });

  it('should return false for non-nullable type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isNullableType(type)).toBe(false);
  });
});

describe('isStringType', () => {
  it('should return true for string type', () => {
    const type = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    expect(isStringType(type)).toBe(true);
  });

  it('should return true for string literal type', () => {
    const type = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    expect(isStringType(type)).toBe(true);
  });

  it('should return true for union of all strings', () => {
    const stringType1 = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType2 = {
      flags: ts.TypeFlags.StringLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringType1, stringType2],
    } as unknown as ts.Type;

    expect(isStringType(unionType)).toBe(true);
  });

  it('should return false for union with non-string', () => {
    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringType, numberType],
    } as unknown as ts.Type;

    expect(isStringType(unionType)).toBe(false);
  });

  it('should return false for non-string type', () => {
    const type = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isStringType(type)).toBe(false);
  });
});

describe('isNumberType', () => {
  it('should return true for number type', () => {
    const type = {
      flags: ts.TypeFlags.Number,
    } as ts.Type;

    expect(isNumberType(type)).toBe(true);
  });

  it('should return true for number literal type', () => {
    const type = {
      flags: ts.TypeFlags.NumberLiteral,
    } as ts.Type;

    expect(isNumberType(type)).toBe(true);
  });

  it('should return true for union of all numbers', () => {
    const numberType1 = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
    } as unknown as ts.Type;

    const numberType2 = {
      flags: ts.TypeFlags.NumberLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [numberType1, numberType2],
    } as unknown as ts.Type;

    expect(isNumberType(unionType)).toBe(true);
  });

  it('should return false for union with non-number', () => {
    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [numberType, stringType],
    } as unknown as ts.Type;

    expect(isNumberType(unionType)).toBe(false);
  });
});

describe('isBooleanType', () => {
  it('should return true for boolean type', () => {
    const type = {
      flags: ts.TypeFlags.Boolean,
    } as ts.Type;

    expect(isBooleanType(type)).toBe(true);
  });

  it('should return true for boolean literal type', () => {
    const type = {
      flags: ts.TypeFlags.BooleanLiteral,
    } as ts.Type;

    expect(isBooleanType(type)).toBe(true);
  });

  it('should return true for union of all booleans', () => {
    const booleanType1 = {
      flags: ts.TypeFlags.Boolean,
      isUnion: () => false,
    } as unknown as ts.Type;

    const booleanType2 = {
      flags: ts.TypeFlags.BooleanLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [booleanType1, booleanType2],
    } as unknown as ts.Type;

    expect(isBooleanType(unionType)).toBe(true);
  });

  it('should return false for union with non-boolean', () => {
    const booleanType = {
      flags: ts.TypeFlags.Boolean,
      isUnion: () => false,
    } as unknown as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [booleanType, stringType],
    } as unknown as ts.Type;

    expect(isBooleanType(unionType)).toBe(false);
  });
});

describe('isArrayType', () => {
  let mockChecker: ts.TypeChecker;

  beforeEach(() => {
    mockChecker = {
      isArrayType: vi.fn().mockReturnValue(true),
    } as unknown as ts.TypeChecker;
  });

  it('should return true for array type', () => {
    const symbol = {
      getName: () => 'Array',
    } as ts.Symbol;

    const type = {
      getSymbol: () => symbol,
    } as unknown as ts.Type;

    expect(isArrayType(type, mockChecker)).toBe(true);
    expect(mockChecker.isArrayType).toHaveBeenCalledWith(type);
  });

  it('should return false when symbol name is not Array', () => {
    const symbol = {
      getName: () => 'String',
    } as ts.Symbol;

    const type = {
      getSymbol: () => symbol,
    } as unknown as ts.Type;

    expect(isArrayType(type, mockChecker)).toBe(false);
  });

  it('should return false when symbol is missing', () => {
    const type = {
      getSymbol: () => null,
    } as unknown as ts.Type;

    expect(isArrayType(type, mockChecker)).toBe(false);
  });

  it('should return false when checker says it is not an array', () => {
    const symbol = {
      getName: () => 'Array',
    } as ts.Symbol;

    const type = {
      getSymbol: () => symbol,
    } as unknown as ts.Type;

    const checker = {
      isArrayType: vi.fn().mockReturnValue(false),
    } as unknown as ts.TypeChecker;

    expect(isArrayType(type, checker)).toBe(false);
  });
});

describe('isPromiseType', () => {
  it('should return true for Promise type', () => {
    const symbol = {
      getName: () => 'Promise',
    } as ts.Symbol;

    const type = {
      getSymbol: () => symbol,
    } as unknown as ts.Type;

    expect(isPromiseType(type)).toBe(true);
  });

  it('should return false when symbol name is not Promise', () => {
    const symbol = {
      getName: () => 'Array',
    } as ts.Symbol;

    const type = {
      getSymbol: () => symbol,
    } as unknown as ts.Type;

    expect(isPromiseType(type)).toBe(false);
  });

  it('should return false when symbol is missing', () => {
    const type = {
      getSymbol: () => null,
    } as unknown as ts.Type;

    expect(isPromiseType(type)).toBe(false);
  });
});

describe('getTypeArguments', () => {
  let mockChecker: ts.TypeChecker;

  beforeEach(() => {
    mockChecker = {
      isArrayType: vi.fn().mockReturnValue(false),
      getTypeArguments: vi.fn().mockReturnValue([]),
    } as unknown as ts.TypeChecker;
  });

  it('should return type arguments from TypeReference', () => {
    const typeArgs = [
      { flags: ts.TypeFlags.String } as ts.Type,
      { flags: ts.TypeFlags.Number } as ts.Type,
    ];

    const type = {
      typeArguments: typeArgs,
    } as unknown as ts.TypeReference;

    const result = getTypeArguments(type as ts.Type, mockChecker);
    expect(result).toBe(typeArgs);
  });

  it('should return empty array when typeArguments is missing', () => {
    const type = {} as unknown as ts.TypeReference;

    const result = getTypeArguments(type as ts.Type, mockChecker);
    expect(result).toEqual([]);
  });

  it('should use checker.getTypeArguments for array types', () => {
    const typeArgs = [
      { flags: ts.TypeFlags.String } as ts.Type,
    ];

    const type = {} as unknown as ts.Type;

    const checker = {
      isArrayType: vi.fn().mockReturnValue(true),
      getTypeArguments: vi.fn().mockReturnValue(typeArgs),
    } as unknown as ts.TypeChecker;

    const result = getTypeArguments(type, checker);
    expect(result).toBe(typeArgs);
    expect(checker.isArrayType).toHaveBeenCalledWith(type);
    expect(checker.getTypeArguments).toHaveBeenCalledWith(type);
  });
});

describe('typeMatchesPredicateRecursive', () => {
  it('should return true when predicate matches', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => (t.flags & ts.TypeFlags.String) !== 0;

    expect(typeMatchesPredicateRecursive(type, predicate)).toBe(true);
  });

  it('should return false when predicate does not match', () => {
    const type = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => (t.flags & ts.TypeFlags.String) !== 0;

    expect(typeMatchesPredicateRecursive(type, predicate)).toBe(false);
  });

  it('should return true for union when any type matches', () => {
    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      isIntersection: () => false,
      types: [stringType, numberType],
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => (t.flags & ts.TypeFlags.String) !== 0;

    expect(typeMatchesPredicateRecursive(unionType, predicate)).toBe(true);
  });

  it('should return false for union when no type matches', () => {
    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const booleanType = {
      flags: ts.TypeFlags.Boolean,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      isIntersection: () => false,
      types: [numberType, booleanType],
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => (t.flags & ts.TypeFlags.String) !== 0;

    expect(typeMatchesPredicateRecursive(unionType, predicate)).toBe(false);
  });

  it('should return true for intersection when all types match', () => {
    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const literalType = {
      flags: ts.TypeFlags.StringLiteral,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const intersectionType = {
      flags: 0,
      isUnion: () => false,
      isIntersection: () => true,
      types: [stringType, literalType],
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => 
      (t.flags & ts.TypeFlags.String) !== 0 || 
      (t.flags & ts.TypeFlags.StringLiteral) !== 0;

    expect(typeMatchesPredicateRecursive(intersectionType, predicate)).toBe(true);
  });

  it('should return false for intersection when any type does not match', () => {
    const stringType = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const numberType = {
      flags: ts.TypeFlags.Number,
      isUnion: () => false,
      isIntersection: () => false,
    } as unknown as ts.Type;

    const intersectionType = {
      flags: 0,
      isUnion: () => false,
      isIntersection: () => true,
      types: [stringType, numberType],
    } as unknown as ts.Type;

    const predicate = (t: ts.Type) => (t.flags & ts.TypeFlags.String) !== 0;

    expect(typeMatchesPredicateRecursive(intersectionType, predicate)).toBe(false);
  });
});

/**
 * Tests for Type-Aware Security Utilities
 * 
 * These functions are designed to reduce false positives in security rules
 * by detecting statically constrained types (like unions of string literals).
 */

describe('isStringLiteralType', () => {
  it('should return true for string literal type', () => {
    const type = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    expect(isStringLiteralType(type)).toBe(true);
  });

  it('should return false for general string type', () => {
    const type = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    expect(isStringLiteralType(type)).toBe(false);
  });

  it('should return false for number type', () => {
    const type = {
      flags: ts.TypeFlags.Number,
    } as ts.Type;

    expect(isStringLiteralType(type)).toBe(false);
  });
});

describe('isNumberLiteralType', () => {
  it('should return true for number literal type', () => {
    const type = {
      flags: ts.TypeFlags.NumberLiteral,
    } as ts.Type;

    expect(isNumberLiteralType(type)).toBe(true);
  });

  it('should return false for general number type', () => {
    const type = {
      flags: ts.TypeFlags.Number,
    } as ts.Type;

    expect(isNumberLiteralType(type)).toBe(false);
  });
});

describe('isUnionOfLiterals', () => {
  it('should return true for single string literal type', () => {
    const type = {
      flags: ts.TypeFlags.StringLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(type)).toBe(true);
  });

  it('should return true for single number literal type', () => {
    const type = {
      flags: ts.TypeFlags.NumberLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(type)).toBe(true);
  });

  it('should return true for boolean literal type', () => {
    const type = {
      flags: ts.TypeFlags.BooleanLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(type)).toBe(true);
  });

  it('should return true for union of string literals', () => {
    const literal1 = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const literal2 = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [literal1, literal2],
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(unionType)).toBe(true);
  });

  it('should return true for union of mixed literals (string and number)', () => {
    const stringLiteral = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const numberLiteral = {
      flags: ts.TypeFlags.NumberLiteral,
    } as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringLiteral, numberLiteral],
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(unionType)).toBe(true);
  });

  it('should return false for general string type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(type)).toBe(false);
  });

  it('should return false for union containing general string', () => {
    const stringLiteral = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const stringType = {
      flags: ts.TypeFlags.String,
    } as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringLiteral, stringType],
    } as unknown as ts.Type;

    expect(isUnionOfLiterals(unionType)).toBe(false);
  });
});

describe('isUnionOfStringLiterals', () => {
  it('should return true for single string literal type', () => {
    const type = {
      flags: ts.TypeFlags.StringLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfStringLiterals(type)).toBe(true);
  });

  it('should return true for union of string literals', () => {
    const literal1 = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const literal2 = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [literal1, literal2],
    } as unknown as ts.Type;

    expect(isUnionOfStringLiterals(unionType)).toBe(true);
  });

  it('should return false for number literal type', () => {
    const type = {
      flags: ts.TypeFlags.NumberLiteral,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfStringLiterals(type)).toBe(false);
  });

  it('should return false for union containing number literal', () => {
    const stringLiteral = {
      flags: ts.TypeFlags.StringLiteral,
    } as ts.Type;

    const numberLiteral = {
      flags: ts.TypeFlags.NumberLiteral,
    } as ts.Type;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringLiteral, numberLiteral],
    } as unknown as ts.Type;

    expect(isUnionOfStringLiterals(unionType)).toBe(false);
  });
});

describe('getStringLiteralValues', () => {
  it('should return single value for string literal type', () => {
    const type = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
      isUnion: () => false,
    } as unknown as ts.LiteralType;

    expect(getStringLiteralValues(type)).toEqual(['name']);
  });

  it('should return all values for union of string literals', () => {
    const literal1 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const literal2 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'email',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [literal1, literal2],
    } as unknown as ts.Type;

    expect(getStringLiteralValues(unionType)).toEqual(['name', 'email']);
  });

  it('should return null for general string type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(getStringLiteralValues(type)).toBeNull();
  });

  it('should return null for union containing non-string literal', () => {
    const stringLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const numberLiteral = {
      flags: ts.TypeFlags.NumberLiteral,
      value: 42,
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [stringLiteral, numberLiteral],
    } as unknown as ts.Type;

    expect(getStringLiteralValues(unionType)).toBeNull();
  });
});

describe('isUnionOfSafeStringLiterals', () => {
  it('should return true for safe string literals', () => {
    const literal1 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const literal2 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'email',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [literal1, literal2],
    } as unknown as ts.Type;

    expect(isUnionOfSafeStringLiterals(unionType)).toBe(true);
  });

  it('should return false for union containing __proto__', () => {
    const safeLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const dangerousLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: '__proto__',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [safeLiteral, dangerousLiteral],
    } as unknown as ts.Type;

    expect(isUnionOfSafeStringLiterals(unionType)).toBe(false);
  });

  it('should return false for union containing prototype', () => {
    const safeLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const dangerousLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'prototype',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [safeLiteral, dangerousLiteral],
    } as unknown as ts.Type;

    expect(isUnionOfSafeStringLiterals(unionType)).toBe(false);
  });

  it('should return false for union containing constructor', () => {
    const safeLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'name',
    } as unknown as ts.LiteralType;

    const dangerousLiteral = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'constructor',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [safeLiteral, dangerousLiteral],
    } as unknown as ts.Type;

    expect(isUnionOfSafeStringLiterals(unionType)).toBe(false);
  });

  it('should return false for general string type', () => {
    const type = {
      flags: ts.TypeFlags.String,
      isUnion: () => false,
    } as unknown as ts.Type;

    expect(isUnionOfSafeStringLiterals(type)).toBe(false);
  });

  it('should use custom dangerous properties list', () => {
    const literal1 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'safe',
    } as unknown as ts.LiteralType;

    const literal2 = {
      flags: ts.TypeFlags.StringLiteral,
      value: 'custom_dangerous',
    } as unknown as ts.LiteralType;

    const unionType = {
      flags: 0,
      isUnion: () => true,
      types: [literal1, literal2],
    } as unknown as ts.Type;

    // With default dangerous properties, should be safe
    expect(isUnionOfSafeStringLiterals(unionType)).toBe(true);

    // With custom dangerous properties including 'custom_dangerous'
    expect(isUnionOfSafeStringLiterals(unionType, ['custom_dangerous'])).toBe(false);
  });
});

