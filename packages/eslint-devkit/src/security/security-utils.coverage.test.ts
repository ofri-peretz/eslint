/**
 * Coverage-focused tests for security-utils.ts
 *
 * Layer-2 raw unit tests with synthetic AST nodes for the AST traversal and
 * user-input detection utilities, plus the isInputSafe BinaryExpression path.
 */
import { describe, it, expect } from 'vitest';
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import {
  isInputSafe,
  createSafetyChecker,
  shouldSkipForSafety,
  findAncestor,
  isInsideLoop,
  isInsideFunction,
  getContainingFunction,
  isUserInputIdentifier,
  isUserInputExpression,
  DEFAULT_USER_INPUT_PATTERNS,
} from './security-utils';

// ---------------------------------------------------------------------------
// Synthetic node builders
// ---------------------------------------------------------------------------

function makeNode(
  type: string,
  extra: Record<string, unknown> = {},
): TSESTree.Node {
  return {
    type,
    parent: undefined,
    range: [0, 1],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
    ...extra,
  } as unknown as TSESTree.Node;
}

function chain(...nodes: TSESTree.Node[]): TSESTree.Node {
  for (let i = 0; i < nodes.length - 1; i++) {
    (nodes[i] as { parent?: TSESTree.Node }).parent = nodes[i + 1];
  }
  return nodes[0];
}

function makeContext(
  overrides: Partial<{
    getText: (node?: unknown) => string;
    getCommentsBefore: (node: unknown) => Array<{ type: string; value: string }>;
  }> = {},
): TSESLint.RuleContext<string, unknown[]> {
  const sourceCode = {
    getText: overrides.getText ?? (() => ''),
    getCommentsBefore: overrides.getCommentsBefore ?? (() => []),
    getScope: () => ({ variables: [] }),
  };
  return {
    sourceCode,
    getSourceCode: () => sourceCode,
    settings: {},
    options: [],
  } as unknown as TSESLint.RuleContext<string, unknown[]>;
}

const sanitizeCall = () =>
  makeNode('CallExpression', {
    callee: makeNode('Identifier', { name: 'sanitize' }),
    arguments: [],
  });

// ---------------------------------------------------------------------------
// isInputSafe — BinaryExpression branches
// ---------------------------------------------------------------------------

describe('isInputSafe with BinaryExpression', () => {
  it('returns true when the LEFT side is a sanitization call', () => {
    const node = makeNode('BinaryExpression', {
      operator: '+',
      left: sanitizeCall(),
      right: makeNode('Identifier', { name: 'rest' }),
    });
    expect(isInputSafe(node, makeContext())).toBe(true);
  });

  it('returns true when the RIGHT side is a sanitization call', () => {
    const node = makeNode('BinaryExpression', {
      operator: '+',
      left: makeNode('Identifier', { name: 'prefix' }),
      right: sanitizeCall(),
    });
    expect(isInputSafe(node, makeContext())).toBe(true);
  });

  it('returns false when neither side is sanitized', () => {
    const node = makeNode('BinaryExpression', {
      operator: '+',
      left: makeNode('Identifier', { name: 'a' }),
      right: makeNode('Identifier', { name: 'b' }),
    });
    expect(isInputSafe(node, makeContext())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldSkipForSafety
// ---------------------------------------------------------------------------

describe('shouldSkipForSafety', () => {
  it('returns true when the safety checker deems the node safe', () => {
    const checker = createSafetyChecker({});
    expect(shouldSkipForSafety(checker, sanitizeCall(), makeContext())).toBe(
      true,
    );
  });

  it('returns false in strict mode even for sanitized input', () => {
    const checker = createSafetyChecker({ strictMode: true });
    expect(shouldSkipForSafety(checker, sanitizeCall(), makeContext())).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// findAncestor and wrappers
// ---------------------------------------------------------------------------

describe('findAncestor', () => {
  it('returns the first ancestor matching the predicate', () => {
    const target = makeNode('ForStatement');
    const node = chain(makeNode('Identifier'), makeNode('BlockStatement'), target);
    expect(findAncestor(node, (n) => n.type === 'ForStatement')).toBe(target);
  });

  it('returns null when the parent chain ends without a match', () => {
    const node = chain(makeNode('Identifier'), makeNode('Program'));
    expect(findAncestor(node, (n) => n.type === 'ForStatement')).toBeNull();
  });

  it('stops at maxDepth even on a longer chain', () => {
    const target = makeNode('ForStatement');
    const node = chain(
      makeNode('Identifier'),
      makeNode('BlockStatement'),
      makeNode('BlockStatement'),
      target,
    );
    // target is 3 levels up; maxDepth 2 stops before reaching it
    expect(findAncestor(node, (n) => n.type === 'ForStatement', 2)).toBeNull();
    // default depth (20) finds it
    expect(findAncestor(node, (n) => n.type === 'ForStatement')).toBe(target);
  });
});

describe('isInsideLoop / isInsideFunction / getContainingFunction', () => {
  it('detects each loop node type', () => {
    for (const loopType of [
      'ForStatement',
      'WhileStatement',
      'DoWhileStatement',
      'ForInStatement',
      'ForOfStatement',
    ]) {
      const node = chain(makeNode('Identifier'), makeNode(loopType));
      expect(isInsideLoop(node)).toBe(true);
    }
  });

  it('returns false when not inside a loop', () => {
    const node = chain(makeNode('Identifier'), makeNode('Program'));
    expect(isInsideLoop(node)).toBe(false);
  });

  it('detects containing functions', () => {
    const fn = makeNode('FunctionDeclaration');
    const node = chain(makeNode('Identifier'), makeNode('BlockStatement'), fn);
    expect(isInsideFunction(node)).toBe(true);
    expect(getContainingFunction(node)).toBe(fn);
  });

  it('returns false/null outside any function', () => {
    const node = chain(makeNode('Identifier'), makeNode('Program'));
    expect(isInsideFunction(node)).toBe(false);
    expect(getContainingFunction(node)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// User input detection
// ---------------------------------------------------------------------------

describe('isUserInputIdentifier', () => {
  it('matches default patterns case-insensitively', () => {
    expect(isUserInputIdentifier('reqBody')).toBe(true);
    expect(isUserInputIdentifier('USERINPUT')).toBe(true);
    expect(isUserInputIdentifier('safeConst')).toBe(false);
  });

  it('honors custom pattern lists', () => {
    expect(isUserInputIdentifier('taintedValue', ['tainted'])).toBe(true);
    expect(isUserInputIdentifier('reqBody', ['tainted'])).toBe(false);
  });

  it('exports the default pattern list', () => {
    expect(DEFAULT_USER_INPUT_PATTERNS).toContain('req');
    expect(DEFAULT_USER_INPUT_PATTERNS).toContain('userInput');
  });
});

describe('isUserInputExpression', () => {
  const exprNode = makeNode('MemberExpression') as TSESTree.Expression;

  it('detects user input references in the expression text (default patterns)', () => {
    const context = makeContext({ getText: () => 'req.body.name' });
    expect(
      isUserInputExpression(
        exprNode,
        context.sourceCode as unknown as TSESLint.SourceCode,
      ),
    ).toBe(true);
  });

  it('returns false for text without user-input references', () => {
    const context = makeContext({ getText: () => 'CONSTANT_VALUE' });
    expect(
      isUserInputExpression(
        exprNode,
        context.sourceCode as unknown as TSESLint.SourceCode,
      ),
    ).toBe(false);
  });

  it('honors custom pattern lists', () => {
    const context = makeContext({ getText: () => 'formPayload.name' });
    expect(
      isUserInputExpression(
        exprNode,
        context.sourceCode as unknown as TSESLint.SourceCode,
        ['formPayload'],
      ),
    ).toBe(true);
  });
});
