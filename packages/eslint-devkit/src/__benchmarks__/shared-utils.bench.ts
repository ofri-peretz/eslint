/**
 * Performance benchmarks for eslint-devkit shared utilities
 *
 * These utilities are used across ALL 206 rules in the Interlace fleet.
 * Performance regressions here have a multiplicative impact on lint time.
 *
 * Run: npx vitest bench --config packages/eslint-devkit/vitest.config.mts
 */
import { bench, describe } from 'vitest';
import { formatLLMMessage } from '../messaging/formatters';
import { MessageIcons } from '../messaging/constants';
import { createSafetyChecker, hasSafeAnnotation, isParameterizedQuery, isUserInputIdentifier } from '../security/security-utils';
import { isNodeOfType, isFunctionNode, getIdentifierName, isCallExpression, getStaticValue } from '../ast/ast-utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

// ── Mock AST Nodes ──────────────────────────────────────────────────
// Realistic AST nodes that simulate what rules encounter at runtime

const mockIdentifier: TSESTree.Identifier = {
  type: AST_NODE_TYPES.Identifier,
  name: 'userInput',
  range: [0, 9],
  loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 9 } },
  decorators: [],
  optional: false,
  typeAnnotation: undefined,
  parent: null as unknown as TSESTree.Node,
};

const mockCallExpression: TSESTree.CallExpression = {
  type: AST_NODE_TYPES.CallExpression,
  callee: {
    type: AST_NODE_TYPES.Identifier,
    name: 'query',
    range: [0, 5],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
    decorators: [],
    optional: false,
    typeAnnotation: undefined,
    parent: null as unknown as TSESTree.Node,
  } as TSESTree.Identifier,
  arguments: [],
  optional: false,
  typeArguments: undefined,
  range: [0, 7],
  loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 7 } },
  parent: null as unknown as TSESTree.Node,
};

const mockLiteral: TSESTree.StringLiteral = {
  type: AST_NODE_TYPES.Literal,
  value: 'SELECT * FROM users WHERE id = $1',
  raw: "'SELECT * FROM users WHERE id = $1'",
  range: [0, 36],
  loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 36 } },
  parent: null as unknown as TSESTree.Node,
};

// ── Benchmarks ──────────────────────────────────────────────────────

describe('formatLLMMessage (164 rules)', () => {
  bench('simple message', () => {
    formatLLMMessage({
      icon: MessageIcons.SECURITY,
      issueName: 'SQL Injection',
      description: 'Unsanitized user input in database query',
      severity: 'CRITICAL',
      cwe: 'CWE-89',
      fix: 'Use parameterized queries',
      documentationLink: 'https://cwe.mitre.org/data/definitions/89.html',
    });
  });

  bench('full message with all fields', () => {
    formatLLMMessage({
      icon: MessageIcons.SECURITY,
      issueName: 'SQL Injection via string concatenation',
      description: 'User input is directly concatenated into SQL query string without parameterization',
      severity: 'CRITICAL',
      cwe: 'CWE-89',
      owasp: 'A03:2021',
      fix: 'Use parameterized queries with $1, $2 placeholders',
      documentationLink: 'https://cwe.mitre.org/data/definitions/89.html',
    });
  });
});

describe('createSafetyChecker (14 rules)', () => {
  bench('instantiation', () => {
    createSafetyChecker({
      trustedAnnotations: ['@safe', '@trusted', '@sanitized'],
    });
  });

  const checker = createSafetyChecker({
    trustedAnnotations: ['@safe', '@trusted'],
  });

  bench('isSafe check (miss)', () => {
    // Most calls will be misses (no annotation present)
    checker.isSafe(mockIdentifier, {
      sourceCode: {
        getText: () => 'const x = userInput;',
        getAllComments: () => [],
      },
    } as any);
  });
});

describe('isParameterizedQuery', () => {
  bench('parameterized (safe)', () => {
    isParameterizedQuery('SELECT * FROM users WHERE id = $1 AND name = $2');
  });

  bench('concatenated (unsafe)', () => {
    isParameterizedQuery("SELECT * FROM users WHERE id = '" + "test" + "'");
  });

  bench('empty query', () => {
    isParameterizedQuery('');
  });
});

describe('isUserInputIdentifier', () => {
  bench('match (req.body)', () => {
    isUserInputIdentifier('req.body.username');
  });

  bench('miss (localVar)', () => {
    isUserInputIdentifier('localVariable');
  });
});

describe('AST utils', () => {
  bench('isNodeOfType — Identifier', () => {
    isNodeOfType(mockIdentifier, AST_NODE_TYPES.Identifier);
  });

  bench('isNodeOfType — miss', () => {
    isNodeOfType(mockIdentifier, AST_NODE_TYPES.CallExpression);
  });

  bench('isFunctionNode — miss', () => {
    isFunctionNode(mockIdentifier);
  });

  bench('getIdentifierName', () => {
    getIdentifierName(mockIdentifier);
  });

  bench('isCallExpression', () => {
    isCallExpression(mockCallExpression);
  });

  bench('getStaticValue — literal', () => {
    getStaticValue(mockLiteral);
  });
});

describe('hasSafeAnnotation (4 rules)', () => {
  bench('no annotation (common path)', () => {
    hasSafeAnnotation(mockIdentifier, {
      sourceCode: {
        getAllComments: () => [],
      },
    } as any);
  });

  bench('with comments to scan', () => {
    hasSafeAnnotation(mockIdentifier, {
      sourceCode: {
        getAllComments: () => [
          { type: 'Block', value: ' Process user data ', range: [0, 25], loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 25 } } },
          { type: 'Line', value: ' validate input first', range: [30, 55], loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 25 } } },
        ],
      },
    } as any);
  });
});
