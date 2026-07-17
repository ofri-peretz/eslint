/**
 * @fileoverview Branch-coverage tests for require-tool-schema.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolSchema } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-tool-schema (branch coverage)', requireToolSchema, {
  valid: [
    // tool() with no argument — nothing to inspect.
    {
      code: `const t = tool();`,
    },
    // tool() with a non-object argument.
    {
      code: `const t = tool(makeConfig());`,
    },
    // Spread before tools in the AI options — non-Property entries skipped
    // while searching for the tools prop.
    {
      code: `generateText({ ...defaults, tools: { a: { inputSchema: s, execute: run } } });`,
    },
    // String-literal 'tools' key — not found by the Identifier-only lookup.
    {
      code: `generateText({ 'tools': { a: { execute: run } } });`,
    },
    // tools value that is not an object literal.
    {
      code: `generateText({ tools: myTools });`,
    },
  ],
  invalid: [
    // tool() helper with spread-only config — no inputSchema found.
    {
      code: `const t = tool({ ...base });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unnamed tool' } }],
    },
    // String-literal 'inputSchema' key in tool() config — keyName resolves to
    // null so the schema is not recognized (documented FN).
    {
      code: `const t = tool({ 'inputSchema': schema });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unnamed tool' } }],
    },
    // String-literal tool name — resolved via String(key.value).
    {
      code: `generateText({ tools: { 'my-tool': { execute: run } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'my-tool' } }],
    },
    // Computed (non-Identifier, non-Literal) tool key — falls back to 'unknown'.
    {
      code: `generateText({ tools: { [cfg.name]: { execute: run } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unknown' } }],
    },
    // String-literal 'inputSchema' key inside a tool definition — not
    // recognized, tool reported (documented FN).
    {
      code: `generateText({ tools: { myTool: { 'inputSchema': schema } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'myTool' } }],
    },
  ],
});
