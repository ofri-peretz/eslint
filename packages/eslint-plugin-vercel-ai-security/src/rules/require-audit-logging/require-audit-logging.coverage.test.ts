/**
 * @fileoverview Branch-coverage tests for require-audit-logging.
 *
 * Layer 1: parser-reachable statement/block shapes through RuleTester.
 * Layer 2: parser-unreachable guards (orphan nodes, detached statements)
 * via devkit's createWithMockContext with synthetic AST objects.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireAuditLogging } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-audit-logging (branch coverage)', requireAuditLogging, {
  valid: [
    // Logging two statements before the AI call (within the 3-statement window).
    {
      code: `
        function handler() {
          logger.info('about to call AI');
          prepare();
          generateText({ prompt: p });
        }
      `,
      options: [{ allowInTests: false }],
    },
  ],
  invalid: [
    // AI call as an if-test: the parent walk exhausts at Program (statement
    // resolves to null) — still reported.
    {
      code: `if (generateText({ prompt: p })) {}`,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Unbraced if-consequent: containing "block" is the IfStatement, not a
    // BlockStatement/Program — hasNearbyLogging returns false.
    {
      code: `if (ready) generateText({ prompt: p });`,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Preceding statement is a VariableDeclaration — not a logging statement.
    {
      code: `
        const a = 1;
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Preceding ExpressionStatement that is not a call — not a logging statement.
    {
      code: `
        a++;
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Three non-logging calls before — window scanned, nothing matches.
    {
      code: `
        doWork();
        doMore();
        doThird();
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for parser-unreachable guards in hasNearbyLogging.
// The mock sourceCode.getText stub returns 'generateText' so the callee always
// matches; each synthetic shape isolates one unreachable guard.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

function runCallListener(node: unknown) {
  const { listeners, reports } = createWithMockContext(requireAuditLogging, {
    options: [{ allowInTests: false }],
    sourceText: 'generateText',
  });
  (listeners.CallExpression as Listener)(node);
  return reports;
}

describe('require-audit-logging — synthetic AST', () => {
  it('reports when the call node has no parent at all', () => {
    const node = { type: 'CallExpression', callee: { type: 'Identifier', name: 'generateText' }, parent: null };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });

  it('reports when the containing statement is detached from any block', () => {
    const stmt: Record<string, unknown> = { type: 'ExpressionStatement', parent: undefined };
    const node = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'generateText' },
      parent: stmt,
    };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });

  it('reports when the statement is not found in its own block body (idx === -1)', () => {
    const block = { type: 'BlockStatement', body: [{ type: 'EmptyStatement' }] };
    const stmt = { type: 'ExpressionStatement', parent: block };
    const node = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'generateText' },
      parent: stmt,
    };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });
});
