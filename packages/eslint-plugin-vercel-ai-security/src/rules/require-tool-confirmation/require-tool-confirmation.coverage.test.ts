/**
 * @fileoverview Branch-coverage tests for require-tool-confirmation.
 *
 * Layer 1: parser-reachable key/parent shapes through RuleTester.
 * Layer 2: the orphan-Property guard (parent nullish) via devkit's
 * createWithMockContext with a synthetic AST object.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireToolConfirmation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-tool-confirmation (branch coverage)', requireToolConfirmation, {
  valid: [
    // Computed (non-Identifier, non-Literal) key — handler bails immediately.
    {
      code: `const t = { [cfg.name]: { execute: run } };`,
    },
    // Destructive tool outside a tools object — grandparent is not a Property.
    {
      code: `const x = { deleteUser: { execute: run } };`,
    },
    // Wrapper key is not literally 'tools'.
    {
      code: `generateText({ notTools: { deleteUser: { execute: run } } });`,
    },
    // Wrapper key is a string literal — toolsKey.type check rejects it.
    {
      code: `generateText({ 'tools': { deleteUser: { execute: run } } });`,
    },
    // Destructive tool defined via the tool() helper CallExpression — assumed handled.
    {
      code: `generateText({ tools: { deleteUser: tool({ requiresConfirmation: true }) } });`,
    },
  ],
  invalid: [
    // Spread inside the tool definition — skipped by hasConfirmationFlag,
    // no confirmation prop found, reported.
    {
      code: `generateText({ tools: { deleteUser: { ...baseTool } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
    // String-literal confirmation key — keyName resolves to null so the flag
    // is not recognized (documented FN: only Identifier keys are matched).
    {
      code: `generateText({ tools: { deleteUser: { 'requiresConfirmation': true } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
    // String-literal tool name — resolved via String(key.value).
    {
      code: `generateText({ tools: { 'deleteUser': { execute: run } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for the parser-unreachable orphan-Property guard.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

describe('require-tool-confirmation — synthetic AST', () => {
  it('does not report a destructive Property detached from any object (parent null)', () => {
    const { listeners, reports } = createWithMockContext(requireToolConfirmation, {
      options: [{}],
    });
    const orphanProperty = {
      type: 'Property',
      key: { type: 'Identifier', name: 'deleteUser' },
      value: { type: 'ObjectExpression', properties: [] },
      parent: null,
    };
    (listeners.Property as Listener)(orphanProperty);
    expect(reports).toEqual([]);
  });
});
