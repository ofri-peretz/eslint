/**
 * Tests for llm-context utility functions
 */
import { describe, it, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { extractFunctionSignature } from '../ast/ast-utils';

import type { TSESTree } from '@typescript-eslint/utils';

// Helper to parse code and get AST node
function parseCode(code: string): TSESTree.Node {
  const ast = parser.parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module',
  });
  return ast.body[0] as TSESTree.Node;
}

describe('llm-context', () => {
  describe('extractFunctionSignature', () => {
    it('should extract signature for FunctionDeclaration with id', () => {
      const node = parseCode(
        'function test(a, b) { return a + b; }',
      ) as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toBe('function test(a, b)');
    });

    it('should extract signature for FunctionDeclaration without id', () => {
      // FunctionDeclaration always has an id in JavaScript/TypeScript
      // This test covers the case where node.type !== 'FunctionDeclaration' || !node.id
      // We test with a FunctionExpression which doesn't have an id property
      const node = parseCode(
        'const fn = function(a, b) { return a + b; };',
      ) as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'FunctionExpression') {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(a, b) => {...}');
      }
    });

    it('should extract signature for FunctionExpression', () => {
      const node = parseCode(
        'const fn = function(x, y) {};',
      ) as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'FunctionExpression') {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(x, y) => {...}');
      }
    });

    it('should extract signature for ArrowFunctionExpression', () => {
      const node = parseCode(
        'const fn = (a, b) => a + b;',
      ) as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (
        declarator.init &&
        declarator.init.type === 'ArrowFunctionExpression'
      ) {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(a, b) => {...}');
      }
    });

    it('should handle non-Identifier parameters (line 147)', () => {
      const node = parseCode(
        'function test(...args) { return args; }',
      ) as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });

    it('should handle array destructuring parameters', () => {
      const node = parseCode(
        'function test([a, b]) { return a + b; }',
      ) as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });

    it('should handle object destructuring parameters', () => {
      const node = parseCode(
        'function test({ x, y }) { return x + y; }',
      ) as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });
  });
});
