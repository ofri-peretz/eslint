/**
 * Tests for llm-context utility functions
 */
import { describe, it, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import {
  generateLLMContext,
  formatLLMMessage,
  calculateComplexity,
  extractFunctionSignature,
  containsSecurityKeywords,
} from '../utils/llm-context';

// Helper to parse code and get AST node
function parseCode(code: string): TSESTree.Node {
  const ast = parser.parse(code, {
    ecmaVersion: 2022,
    sourceType: 'module',
  });
  return ast.body[0] as TSESTree.Node;
}

describe('llm-context', () => {
  describe('generateLLMContext', () => {
    it('should generate LLM context with all fields', () => {
      const node = parseCode('const x = 1;') as TSESTree.VariableDeclaration;
      const context = generateLLMContext('test-rule', {
        severity: 'error',
        category: 'security',
        filePath: '/path/to/file.ts',
        node,
        details: { customField: 'value' },
        quickFix: {
          automated: true,
          estimatedEffort: '5 minutes',
          changes: ['Change 1', 'Change 2'],
        },
        resources: {
          docs: 'https://example.com/docs',
          examples: 'https://example.com/examples',
          migration: 'https://example.com/migration',
        },
      });

      expect(context.ruleId).toBe('test-rule');
      expect(context.severity).toBe('error');
      expect(context.category).toBe('security');
      expect(context.filePath).toBe('/path/to/file.ts');
      expect(context.location.line).toBeGreaterThan(0);
      expect(context.location.column).toBeGreaterThanOrEqual(0);
      expect(context.quickFix).toBeDefined();
      expect(context.resources).toBeDefined();
      expect((context as unknown as Record<string, unknown>)['customField']).toBe('value');
    });

    it('should handle node without location', () => {
      const node = { type: 'Identifier', name: 'test' } as TSESTree.Node;
      const context = generateLLMContext('test-rule', {
        severity: 'warning',
        category: 'performance',
        filePath: '/path/to/file.ts',
        node,
        details: {},
      });

      expect(context.location.line).toBe(0);
      expect(context.location.column).toBe(0);
    });

    it('should handle optional fields', () => {
      const node = parseCode('const x = 1;') as TSESTree.VariableDeclaration;
      const context = generateLLMContext('test-rule', {
        severity: 'info',
        category: 'accessibility',
        filePath: '/path/to/file.ts',
        node,
        details: {},
      });

      expect(context.quickFix).toBeUndefined();
      expect(context.resources).toBeUndefined();
    });
  });

  describe('formatLLMMessage', () => {
    it('should format message with category emoji', () => {
      const message = formatLLMMessage('Test message', {
        category: 'security',
        filePath: '/path/to/file.ts',
        location: { line: 10, column: 5 },
      });

      expect(message).toContain('🔒');
      expect(message).toContain('Test message');
      expect(message).toContain('/path/to/file.ts:10');
    });

    it('should use default icon when category is missing', () => {
      const message = formatLLMMessage('Test message', {
        filePath: '/path/to/file.ts',
        location: { line: 5, column: 0 },
      });

      expect(message).toContain('📌');
      expect(message).toContain('Test message');
    });

    it('should handle missing location', () => {
      const message = formatLLMMessage('Test message', {
        category: 'performance',
        filePath: '/path/to/file.ts',
      });

      expect(message).toContain('⚡');
      expect(message).toContain('/path/to/file.ts:0');
    });

    it('should handle all category types', () => {
      const categories = ['migration', 'security', 'performance', 'accessibility', 'deprecation', 'domain'] as const;
      const emojis = ['🔄', '🔒', '⚡', '♿', '⚠️', '📝'];

      categories.forEach((category, index) => {
        const message = formatLLMMessage('Test', {
          category,
          filePath: '/path/to/file.ts',
          location: { line: 1, column: 0 },
        });
        expect(message).toContain(emojis[index]);
      });
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for simple code', () => {
      const node = parseCode('const x = 1;');
      const result = calculateComplexity(node);

      expect(result.cyclomaticComplexity).toBeGreaterThanOrEqual(1);
      expect(result.nestingDepth).toBeGreaterThanOrEqual(0);
      expect(result.linesOfCode).toBeGreaterThanOrEqual(0);
    });

    it('should increment complexity for if statements', () => {
      const node = parseCode('if (x) { return true; }');
      const result = calculateComplexity(node);

      expect(result.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should increment complexity for conditional expressions', () => {
      // Note: calculateComplexity only checks the top-level node type
      // For conditional expressions in variable declarations, we need to parse the expression
      const node = parseCode('const x = y ? 1 : 0;') as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'ConditionalExpression') {
        const result = calculateComplexity(declarator.init);
        expect(result.cyclomaticComplexity).toBeGreaterThan(1);
      }
    });

    it('should increment complexity for logical expressions', () => {
      // Note: calculateComplexity only checks the top-level node type
      // For logical expressions in variable declarations, we need to parse the expression
      const node = parseCode('const x = a && b;') as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'LogicalExpression') {
        const result = calculateComplexity(declarator.init);
        expect(result.cyclomaticComplexity).toBeGreaterThan(1);
      }
    });

    it('should increment complexity for switch cases', () => {
      const node = parseCode('switch (x) { case 1: break; }') as TSESTree.SwitchStatement;
      // The function checks for SwitchCase nodes, so we need to pass a case node
      if (node.cases.length > 0) {
        const result = calculateComplexity(node.cases[0]);
        expect(result.cyclomaticComplexity).toBeGreaterThan(1);
      }
    });

    it('should increment complexity for for loops', () => {
      const node = parseCode('for (let i = 0; i < 10; i++) {}');
      const result = calculateComplexity(node);

      expect(result.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should increment complexity for while loops', () => {
      const node = parseCode('while (x) { x--; }');
      const result = calculateComplexity(node);

      expect(result.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should increment complexity for do-while loops', () => {
      const node = parseCode('do { x--; } while (x);');
      const result = calculateComplexity(node);

      expect(result.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should increment complexity for catch clauses', () => {
      const node = parseCode('try { risky(); } catch (e) {}') as TSESTree.TryStatement;
      // The function checks for CatchClause nodes
      if (node.handler) {
        const result = calculateComplexity(node.handler);
        expect(result.cyclomaticComplexity).toBeGreaterThan(1);
      }
    });

    it('should track nesting depth for block statements', () => {
      const node = parseCode('{ { { } } }');
      const result = calculateComplexity(node);

      expect(result.nestingDepth).toBeGreaterThan(0);
    });

    it('should track nesting depth for functions', () => {
      const node = parseCode('function outer() { function inner() {} }');
      const result = calculateComplexity(node);

      expect(result.nestingDepth).toBeGreaterThan(0);
    });

    it('should calculate lines of code from location', () => {
      const node = parseCode('const x = 1;\nconst y = 2;\nconst z = 3;');
      const result = calculateComplexity(node);

      expect(result.linesOfCode).toBeGreaterThan(0);
    });

    it('should handle node without location', () => {
      const node = { type: 'Identifier', name: 'test' } as TSESTree.Node;
      const result = calculateComplexity(node);

      expect(result.linesOfCode).toBe(0);
    });
  });

  describe('extractFunctionSignature', () => {
    it('should extract signature for FunctionDeclaration with id', () => {
      const node = parseCode('function test(a, b) { return a + b; }') as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toBe('function test(a, b)');
    });

    it('should extract signature for FunctionDeclaration without id', () => {
      // FunctionDeclaration always has an id in JavaScript/TypeScript
      // This test covers the case where node.type !== 'FunctionDeclaration' || !node.id
      // We test with a FunctionExpression which doesn't have an id property
      const node = parseCode('const fn = function(a, b) { return a + b; };') as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'FunctionExpression') {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(a, b) => {...}');
      }
    });

    it('should extract signature for FunctionExpression', () => {
      const node = parseCode('const fn = function(x, y) {};') as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'FunctionExpression') {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(x, y) => {...}');
      }
    });

    it('should extract signature for ArrowFunctionExpression', () => {
      const node = parseCode('const fn = (a, b) => a + b;') as TSESTree.VariableDeclaration;
      const declarator = node.declarations[0];
      if (declarator.init && declarator.init.type === 'ArrowFunctionExpression') {
        const signature = extractFunctionSignature(declarator.init);
        expect(signature).toBe('(a, b) => {...}');
      }
    });

    it('should handle non-Identifier parameters (line 147)', () => {
      const node = parseCode('function test(...args) { return args; }') as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });

    it('should handle array destructuring parameters', () => {
      const node = parseCode('function test([a, b]) { return a + b; }') as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });

    it('should handle object destructuring parameters', () => {
      const node = parseCode('function test({ x, y }) { return x + y; }') as TSESTree.FunctionDeclaration;
      const signature = extractFunctionSignature(node);

      expect(signature).toContain('...');
    });
  });

  describe('containsSecurityKeywords', () => {
    it('should detect financial keywords', () => {
      const result = containsSecurityKeywords('processPayment(amount)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('financial');
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should detect auth keywords', () => {
      const result = containsSecurityKeywords('validatePassword(userInput)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('auth');
      expect(result.keywords).toContain('password');
    });

    it('should detect PII keywords', () => {
      const result = containsSecurityKeywords('storeEmail(user.email)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('pii');
      expect(result.keywords).toContain('email');
    });

    it('should detect database keywords', () => {
      const result = containsSecurityKeywords('executeSQL(query)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('database');
      expect(result.keywords).toContain('sql');
    });

    it('should return false for non-sensitive code', () => {
      const result = containsSecurityKeywords('const x = 1;');
      expect(result.isSensitive).toBe(false);
      expect(result.keywords).toEqual([]);
    });

    it('should detect multiple keywords from same category', () => {
      const result = containsSecurityKeywords('processPayment(amount) && chargeCard(card)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('financial');
      expect(result.keywords.length).toBeGreaterThan(1);
    });

    it('should be case insensitive', () => {
      const result = containsSecurityKeywords('PROCESS_PAYMENT(amount)');
      expect(result.isSensitive).toBe(true);
      expect(result.category).toBe('financial');
    });

    it('should detect all financial keywords', () => {
      const keywords = ['payment', 'price', 'charge', 'refund', 'transaction', 'billing', 'invoice'];
      keywords.forEach(keyword => {
        const result = containsSecurityKeywords(`process${keyword}(data)`);
        expect(result.isSensitive).toBe(true);
        expect(result.category).toBe('financial');
      });
    });

    it('should detect all auth keywords', () => {
      const keywords = ['password', 'token', 'session', 'login', 'auth', 'credential', 'secret'];
      keywords.forEach(keyword => {
        const result = containsSecurityKeywords(`validate${keyword}(input)`);
        expect(result.isSensitive).toBe(true);
        expect(result.category).toBe('auth');
      });
    });

    it('should detect all PII keywords', () => {
      const keywords = ['email', 'ssn', 'phone', 'address', 'name', 'dob', 'birthdate'];
      keywords.forEach(keyword => {
        const result = containsSecurityKeywords(`store${keyword}(data)`);
        expect(result.isSensitive).toBe(true);
        expect(result.category).toBe('pii');
      });
    });

    it('should detect all database keywords', () => {
      const keywords = ['query', 'exec', 'execute', 'sql', 'delete', 'drop', 'update', 'insert'];
      keywords.forEach(keyword => {
        const result = containsSecurityKeywords(`${keyword}Data(data)`);
        expect(result.isSensitive).toBe(true);
        expect(result.category).toBe('database');
      });
    });
  });
});

