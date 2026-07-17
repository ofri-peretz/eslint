/**
 * @fileoverview Branch-coverage tests for require-output-filtering.
 *
 * Layer 1: parser-reachable tool-name resolution shapes through RuleTester.
 * Layer 2: parser-unreachable orphan-node guards via devkit's
 * createWithMockContext with synthetic AST objects.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireOutputFiltering } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-output-filtering (branch coverage)', requireOutputFiltering, {
  valid: [
    // String-literal 'execute' key — keyName resolves to null, arrow skipped.
    {
      code: `const w = { 'execute': () => db.queryAll() };`,
    },
    // Arrow not attached to a Property at all.
    {
      code: `const cb = () => db.queryAll();`,
    },
  ],
  invalid: [
    // Full tools nesting: tool name resolved from the tools object property.
    {
      code: `generateText({ tools: { fetchUser: { execute: () => db.queryUsers(id) } } });`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'fetchUser', source: 'db.queryUsers' },
        },
      ],
    },
    // String-literal tool name inside tools — key is not an Identifier, the
    // walk keeps going and falls back to 'unknown'.
    {
      code: `generateText({ tools: { 'fetch-user': { execute: () => db.queryUsers(id) } } });`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'unknown', source: 'db.queryUsers' },
        },
      ],
    },
    // execute outside any tools object — grandparent is never a 'tools'
    // Property, so the name falls back to 'unknown'.
    {
      code: `const worker = { execute: () => db.queryAll() };`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'unknown', source: 'db.queryAll' },
        },
      ],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for parser-unreachable guards.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

describe('require-output-filtering — synthetic AST', () => {
  it('does not report for an orphan arrow function (parent undefined)', () => {
    const { listeners, reports } = createWithMockContext(requireOutputFiltering, {
      options: [{}],
      sourceText: 'db.queryAll',
    });
    const orphanArrow = {
      type: 'ArrowFunctionExpression',
      parent: undefined,
      body: { type: 'CallExpression', callee: { type: 'Identifier', name: 'q' } },
    };
    (listeners.ArrowFunctionExpression as Listener)(orphanArrow);
    expect(reports).toEqual([]);
  });

  it('falls back to "unknown" when the object chain detaches above execute', () => {
    const { listeners, reports } = createWithMockContext(requireOutputFiltering, {
      options: [{}],
      sourceText: 'db.queryAll',
    });
    // execute Property whose ObjectExpression has no parent — the getToolName
    // walk hits the detached top and returns 'unknown'.
    const detachedObject: Record<string, unknown> = { type: 'ObjectExpression', parent: undefined };
    const executeProp: Record<string, unknown> = {
      type: 'Property',
      key: { type: 'Identifier', name: 'execute' },
      parent: detachedObject,
    };
    const arrow = {
      type: 'ArrowFunctionExpression',
      parent: executeProp,
      body: { type: 'CallExpression', callee: { type: 'Identifier', name: 'q' } },
    };
    (listeners.ArrowFunctionExpression as Listener)(arrow);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingOutputFilter',
      data: { toolName: 'unknown', source: 'db.queryAll' },
    });
  });
});
