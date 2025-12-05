/**
 * Comprehensive tests for AST utilities
 * Tests all helper functions for working with ESTree/TSESTree nodes
 */
import { describe, it, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import {
  isNodeOfType,
  isFunctionNode,
  isClassNode,
  isMemberExpression,
  getIdentifierName,
  isCallExpression,
  getFunctionName,
  isInsideNode,
  getAncestorOfType,
  isLiteral,
  isTemplateLiteral,
  getStaticValue,
  extractFunctionSignature,
} from './ast-utils';

/**
 * Helper to parse code and get the first statement
 */
function parseStatement(code: string): TSESTree.Statement {
  const ast = parser.parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module',
  });
  return ast.body[0] as TSESTree.Statement;
}

/**
 * Helper to parse code and get the first expression
 * For expressions, we wrap them in a statement and extract the expression
 */
function parseExpression(code: string): TSESTree.Expression {
  // Wrap expression in a statement to parse it
  const wrapped = `const _ = ${code};`;
  const ast = parser.parse(wrapped, {
    ecmaVersion: 2022,
    sourceType: 'module',
  });
  const stmt = ast.body[0] as TSESTree.VariableDeclaration;
  const declarator = stmt.declarations[0];
  if (!declarator.init) {
    throw new Error(`Failed to parse expression: ${code}`);
  }
  return declarator.init;
}

describe('isNodeOfType', () => {
  it('should return true for matching node type', () => {
    const node = parseStatement('const x = 5;');
    expect(isNodeOfType(node, AST_NODE_TYPES.VariableDeclaration)).toBe(true);
  });

  it('should return false for non-matching node type', () => {
    const node = parseStatement('const x = 5;');
    expect(isNodeOfType(node, AST_NODE_TYPES.FunctionDeclaration)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isNodeOfType(null, AST_NODE_TYPES.VariableDeclaration)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isNodeOfType(undefined, AST_NODE_TYPES.VariableDeclaration)).toBe(
      false,
    );
  });

  it('should work with type narrowing', () => {
    const node = parseStatement('const x = 5;');
    if (isNodeOfType(node, AST_NODE_TYPES.VariableDeclaration)) {
      expect(node.declarations).toBeDefined();
    }
  });
});

describe('isFunctionNode', () => {
  it('should return true for FunctionDeclaration', () => {
    const node = parseStatement('function foo() {}');
    expect(isFunctionNode(node)).toBe(true);
  });

  it('should return true for FunctionExpression', () => {
    const node = parseExpression('(function() {})');
    expect(isFunctionNode(node)).toBe(true);
  });

  it('should return true for ArrowFunctionExpression', () => {
    const node = parseExpression('() => {}');
    expect(isFunctionNode(node)).toBe(true);
  });

  it('should return false for non-function nodes', () => {
    const node = parseStatement('const x = 5;');
    expect(isFunctionNode(node)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isFunctionNode(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isFunctionNode(undefined)).toBe(false);
  });
});

describe('isClassNode', () => {
  it('should return true for ClassDeclaration', () => {
    const node = parseStatement('class Foo {}');
    expect(isClassNode(node)).toBe(true);
  });

  it('should return true for ClassExpression', () => {
    const node = parseExpression('class {}');
    expect(isClassNode(node)).toBe(true);
  });

  it('should return false for non-class nodes', () => {
    const node = parseStatement('const x = 5;');
    expect(isClassNode(node)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isClassNode(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isClassNode(undefined)).toBe(false);
  });
});

describe('isMemberExpression', () => {
  it('should return true for simple member expression', () => {
    const node = parseExpression('console.log');
    expect(isMemberExpression(node, 'console', 'log')).toBe(true);
  });

  it('should return true for member expression with array path', () => {
    const node = parseExpression('foo.bar.baz');
    expect(isMemberExpression(node, ['foo', 'bar'], 'baz')).toBe(true);
  });

  it('should return true when property name is not specified', () => {
    const node = parseExpression('console.log');
    expect(isMemberExpression(node, 'console')).toBe(true);
  });

  it('should return false for non-member expression', () => {
    const node = parseExpression('foo');
    expect(isMemberExpression(node, 'console', 'log')).toBe(false);
  });

  it('should return false for wrong object name', () => {
    const node = parseExpression('console.log');
    expect(isMemberExpression(node, 'window', 'log')).toBe(false);
  });

  it('should return false for wrong property name', () => {
    const node = parseExpression('console.log');
    expect(isMemberExpression(node, 'console', 'error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isMemberExpression(null, 'console', 'log')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMemberExpression(undefined, 'console', 'log')).toBe(false);
  });

  it('should handle nested member expressions correctly', () => {
    const node = parseExpression('a.b.c');
    expect(isMemberExpression(node, ['a', 'b'], 'c')).toBe(true);
    expect(isMemberExpression(node, 'a', 'b')).toBe(false);
  });

  it('should return false when object path is too short', () => {
    const node = parseExpression('a.b');
    expect(isMemberExpression(node, ['a', 'b', 'c'], 'd')).toBe(false);
  });

  it('should return false when nested path has wrong identifier name', () => {
    const node = parseExpression('foo.bar.baz');
    // Wrong first name
    expect(isMemberExpression(node, ['wrong', 'bar'], 'baz')).toBe(false);
    // Wrong middle name
    expect(isMemberExpression(node, ['foo', 'wrong'], 'baz')).toBe(false);
  });

  it('should return false when nested path object is not a MemberExpression', () => {
    const node = parseExpression('console.log');
    // Try to match nested path on simple member expression
    expect(isMemberExpression(node, ['foo', 'bar'], 'log')).toBe(false);
  });
});

describe('getIdentifierName', () => {
  it('should return name for identifier', () => {
    const node = parseExpression('foo');
    expect(getIdentifierName(node)).toBe('foo');
  });

  it('should return null for non-identifier', () => {
    const node = parseExpression('5');
    expect(getIdentifierName(node)).toBe(null);
  });

  it('should return null for null', () => {
    expect(getIdentifierName(null)).toBe(null);
  });

  it('should return null for undefined', () => {
    expect(getIdentifierName(undefined)).toBe(null);
  });
});

describe('isCallExpression', () => {
  it('should return true for call expression', () => {
    const node = parseExpression('foo()');
    expect(isCallExpression(node)).toBe(true);
  });

  it('should return true for call expression with matching function name', () => {
    const node = parseExpression('foo()');
    expect(isCallExpression(node, 'foo')).toBe(true);
  });

  it('should return true for member call expression', () => {
    const node = parseExpression('console.log()');
    expect(isCallExpression(node, 'console', 'log')).toBe(true);
  });

  it('should return false for non-call expression', () => {
    const node = parseExpression('foo');
    expect(isCallExpression(node)).toBe(false);
  });

  it('should return false for wrong function name', () => {
    const node = parseExpression('foo()');
    expect(isCallExpression(node, 'bar')).toBe(false);
  });

  it('should return false for wrong member call', () => {
    const node = parseExpression('console.log()');
    expect(isCallExpression(node, 'console', 'error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isCallExpression(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isCallExpression(undefined)).toBe(false);
  });
});

describe('getFunctionName', () => {
  it('should return name for named function declaration', () => {
    const node = parseStatement(
      'function foo() {}',
    ) as TSESTree.FunctionDeclaration;
    expect(getFunctionName(node)).toBe('foo');
  });

  it('should return name for named function expression', () => {
    const node = parseExpression(
      '(function foo() {})',
    ) as TSESTree.FunctionExpression;
    expect(getFunctionName(node)).toBe('foo');
  });

  it('should return null for anonymous function', () => {
    const node = parseExpression(
      '(function() {})',
    ) as TSESTree.FunctionExpression;
    expect(getFunctionName(node)).toBe(null);
  });
});

describe('isInsideNode', () => {
  it('should return true when node is inside specified parent type', () => {
    const code = `
      function outer() {
        function inner() {}
      }
    `;
    const ast = parser.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    const innerFunction = (ast.body[0] as TSESTree.FunctionDeclaration).body
      .body[0] as TSESTree.FunctionDeclaration;
    const ancestors: TSESTree.Node[] = [
      ast.body[0] as TSESTree.Node,
      (ast.body[0] as TSESTree.FunctionDeclaration).body,
    ];

    expect(
      isInsideNode(
        innerFunction,
        AST_NODE_TYPES.FunctionDeclaration,
        ancestors,
      ),
    ).toBe(true);
  });

  it('should return false when node is not inside specified parent type', () => {
    const code = 'const x = 5;';
    const ast = parser.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    const node = ast.body[0] as TSESTree.Node;
    const ancestors: TSESTree.Node[] = [ast];

    expect(
      isInsideNode(node, AST_NODE_TYPES.FunctionDeclaration, ancestors),
    ).toBe(false);
  });

  it('should return false for empty ancestors', () => {
    const node = parseStatement('const x = 5;');
    expect(isInsideNode(node, AST_NODE_TYPES.FunctionDeclaration, [])).toBe(
      false,
    );
  });
});

describe('getAncestorOfType', () => {
  it('should return ancestor of specified type', () => {
    const ancestors: TSESTree.Node[] = [
      parseStatement('const x = 5;'),
      parseStatement('function foo() {}'),
    ];

    const result = getAncestorOfType(
      AST_NODE_TYPES.FunctionDeclaration,
      ancestors,
    );
    expect(result).toBeDefined();
    expect(result?.type).toBe(AST_NODE_TYPES.FunctionDeclaration);
  });

  it('should return null when no ancestor of type exists', () => {
    const ancestors: TSESTree.Node[] = [
      parseStatement('const x = 5;'),
      parseStatement('const y = 10;'),
    ];

    expect(
      getAncestorOfType(AST_NODE_TYPES.FunctionDeclaration, ancestors),
    ).toBe(null);
  });

  it('should return null for empty ancestors', () => {
    expect(getAncestorOfType(AST_NODE_TYPES.FunctionDeclaration, [])).toBe(
      null,
    );
  });

  it('should return the first matching ancestor (last in array)', () => {
    const func1 = parseStatement('function foo() {}');
    const func2 = parseStatement('function bar() {}');
    const ancestors: TSESTree.Node[] = [func1, func2];

    const result = getAncestorOfType(
      AST_NODE_TYPES.FunctionDeclaration,
      ancestors,
    );
    expect(result).toBe(func2); // Should return the last one (most recent ancestor)
  });
});

describe('isLiteral', () => {
  it('should return true for string literal', () => {
    const node = parseExpression('"hello"');
    expect(isLiteral(node)).toBe(true);
  });

  it('should return true for number literal', () => {
    const node = parseExpression('5');
    expect(isLiteral(node)).toBe(true);
  });

  it('should return true for boolean literal', () => {
    const node = parseExpression('true');
    expect(isLiteral(node)).toBe(true);
  });

  it('should return false for non-literal', () => {
    const node = parseExpression('foo');
    expect(isLiteral(node)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isLiteral(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isLiteral(undefined)).toBe(false);
  });
});

describe('isTemplateLiteral', () => {
  it('should return true for template literal', () => {
    const node = parseExpression('`hello`');
    expect(isTemplateLiteral(node)).toBe(true);
  });

  it('should return true for template literal with expressions', () => {
    const node = parseExpression('`hello ${world}`');
    expect(isTemplateLiteral(node)).toBe(true);
  });

  it('should return false for string literal', () => {
    const node = parseExpression('"hello"');
    expect(isTemplateLiteral(node)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isTemplateLiteral(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isTemplateLiteral(undefined)).toBe(false);
  });
});

describe('getStaticValue', () => {
  it('should return value for string literal', () => {
    const node = parseExpression('"hello"');
    expect(getStaticValue(node)).toBe('hello');
  });

  it('should return value for number literal', () => {
    const node = parseExpression('5');
    expect(getStaticValue(node)).toBe(5);
  });

  it('should return value for boolean literal', () => {
    const node = parseExpression('true');
    expect(getStaticValue(node)).toBe(true);
  });

  it('should return value for simple template literal', () => {
    const node = parseExpression('`hello`');
    expect(getStaticValue(node)).toBe('hello');
  });

  it('should return null when template literal quasis[0] value.cooked is null', () => {
    // This tests the fallback ?? null on line 225
    // We need to manually create a template literal node where quasis[0]?.value.cooked is null
    const node = {
      type: 'TemplateLiteral',
      quasis: [
        {
          value: {
            cooked: null, // This will trigger the ?? null fallback
            raw: '',
          },
        },
      ],
      expressions: [],
    } as unknown as TSESTree.TemplateLiteral;

    const value = getStaticValue(node);
    expect(value).toBe(null);
  });

  it('should return null when template literal quasis array is empty', () => {
    // This tests the optional chaining on quasis[0] when array is empty
    const node = {
      type: 'TemplateLiteral',
      quasis: [],
      expressions: [],
    } as unknown as TSESTree.TemplateLiteral;

    const value = getStaticValue(node);
    expect(value).toBe(null);
  });

  it('should return null for template literal with expressions', () => {
    const node = parseExpression('`hello ${world}`');
    expect(getStaticValue(node)).toBe(undefined);
  });

  it('should return undefined for non-literal', () => {
    const node = parseExpression('foo');
    expect(getStaticValue(node)).toBe(undefined);
  });

  it('should return undefined for null', () => {
    expect(getStaticValue(null)).toBe(undefined);
  });

  it('should return undefined for undefined', () => {
    expect(getStaticValue(undefined)).toBe(undefined);
  });

  it('should return value for regex literal', () => {
    const node = parseExpression('/test/g');
    const value = getStaticValue(node);
    expect(value).toBeInstanceOf(RegExp);
  });

  it('should return value for bigint literal', () => {
    const node = parseExpression('123n');
    const value = getStaticValue(node);
    expect(typeof value).toBe('bigint');
    expect(value).toBe(123n);
  });
});

describe('extractFunctionSignature', () => {
  it('should extract signature for FunctionDeclaration with id', () => {
    const node = parseStatement(
      'function test(a, b) { return a + b; }',
    ) as TSESTree.FunctionDeclaration;
    const signature = extractFunctionSignature(node);

    expect(signature).toBe('function test(a, b)');
  });

  it('should extract signature for FunctionDeclaration without id', () => {
    // FunctionDeclaration always has an id in JavaScript/TypeScript
    // This test covers the case where node.type !== 'FunctionDeclaration' || !node.id
    // We test with a FunctionExpression which doesn't have an id property
    const node = parseStatement(
      'const fn = function(a, b) { return a + b; };',
    ) as TSESTree.VariableDeclaration;
    const declarator = node.declarations[0];
    if (declarator.init && declarator.init.type === 'FunctionExpression') {
      const signature = extractFunctionSignature(declarator.init);
      expect(signature).toBe('(a, b) => {...}');
    }
  });

  it('should extract signature for FunctionExpression', () => {
    const node = parseStatement(
      'const fn = function(x, y) {};',
    ) as TSESTree.VariableDeclaration;
    const declarator = node.declarations[0];
    if (declarator.init && declarator.init.type === 'FunctionExpression') {
      const signature = extractFunctionSignature(declarator.init);
      expect(signature).toBe('(x, y) => {...}');
    }
  });

  it('should extract signature for ArrowFunctionExpression', () => {
    const node = parseStatement(
      'const fn = (a, b) => a + b;',
    ) as TSESTree.VariableDeclaration;
    const declarator = node.declarations[0];
    if (declarator.init && declarator.init.type === 'ArrowFunctionExpression') {
      const signature = extractFunctionSignature(declarator.init);
      expect(signature).toBe('(a, b) => {...}');
    }
  });

  it('should handle non-Identifier parameters (line 147)', () => {
    const node = parseStatement(
      'function test(...args) { return args; }',
    ) as TSESTree.FunctionDeclaration;
    const signature = extractFunctionSignature(node);

    expect(signature).toContain('...');
  });

  it('should handle array destructuring parameters', () => {
    const node = parseStatement(
      'function test([a, b]) { return a + b; }',
    ) as TSESTree.FunctionDeclaration;
    const signature = extractFunctionSignature(node);

    expect(signature).toContain('...');
  });

  it('should handle object destructuring parameters', () => {
    const node = parseStatement(
      'function test({ x, y }) { return x + y; }',
    ) as TSESTree.FunctionDeclaration;
    const signature = extractFunctionSignature(node);

    expect(signature).toContain('...');
  });
});
