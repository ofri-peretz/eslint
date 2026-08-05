/**
 * @fileoverview Tests for require-tool-input-schema rule
 *
 * Coverage intent: every branch of the SDK gate, both registration arities,
 * and the shapes the rule must stay silent on (a config it cannot read is not
 * evidence of a missing schema).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolInputSchema } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const IMPORT = `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';`;

ruleTester.run('require-tool-input-schema', requireToolInputSchema, {
  valid: [
    // inputSchema declared as a shorthand identifier key
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { inputSchema: { path: z.string() } }, handler);
      `,
    },
    // inputSchema declared as a string-literal key
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { 'inputSchema': { path: z.string() } }, handler);
      `,
    },
    // Legacy arity WITH a schema between name and callback
    {
      code: `
        ${IMPORT}
        server.tool('read_file', { path: z.string() }, async (args) => ({}));
      `,
    },
    // No MCP import — the rule must not fire even on the vulnerable shape.
    // This is the scope promise: no SDK, no findings.
    {
      code: `server.registerTool('read_file', { description: 'x' }, handler);`,
    },
    // Non-MCP import must not arm the rule
    {
      code: `
        import { z } from 'zod';
        server.registerTool('read_file', { description: 'x' }, handler);
      `,
    },
    // require() of a non-MCP module must not arm the rule
    {
      code: `
        const z = require('zod');
        server.registerTool('read_file', { description: 'x' }, handler);
      `,
    },
    // require() with a non-literal specifier must not throw or arm the rule
    {
      code: `
        const mod = require(dynamicName);
        server.registerTool('read_file', { description: 'x' }, handler);
      `,
    },
    // Config passed by reference — the schema may well be in there. Guessing
    // would be a false positive on correct code.
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', toolConfig, handler);
      `,
    },
    // No config argument at all — nothing to judge
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file');
      `,
    },
    // Spread-only config — cannot be read, so stays silent
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { ...base }, handler);
      `,
    },
    // Computed key named inputSchema is not a literal declaration
    // (kept valid-shaped here only to exercise the computed branch of the
    // property scan; the call still reports, so it lives in `invalid` below).

    // Legacy arity where the second argument is neither schema nor function
    {
      code: `
        ${IMPORT}
        server.tool('read_file', 42);
      `,
    },
    // Computed member call — server['tool'](...) is not matched
    {
      code: `
        ${IMPORT}
        server['registerTool']('read_file', { description: 'x' }, handler);
      `,
    },
    // Plain function call, not a member expression
    {
      code: `
        ${IMPORT}
        registerTool('read_file', { description: 'x' }, handler);
      `,
    },
    // Unrelated member method
    {
      code: `
        ${IMPORT}
        server.registerResource('file', { description: 'x' }, handler);
      `,
    },
    // Private-method call — a non-computed member whose property is a
    // PrivateIdentifier, not an Identifier.
    {
      code: `
        ${IMPORT}
        class Server { #tool() {} run() { this.#tool(); } }
      `,
    },
    // require() of a non-string literal must not throw or arm the rule
    {
      code: `
        const mod = require(42);
        server.registerTool('read_file', { description: 'x' }, handler);
      `,
    },
  ],

  invalid: [
    // The core case: registered with a config that carries no inputSchema
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { description: 'Read a file' }, handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Armed via require() rather than import
    {
      code: `
        const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
        server.registerTool('read_file', { description: 'Read a file' }, handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Legacy arity: name + inline callback, no schema
    {
      code: `
        ${IMPORT}
        server.tool('read_file', async (args) => ({ content: [] }));
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Legacy arity: name + function expression
    {
      code: `
        ${IMPORT}
        server.tool('read_file', function (args) { return {}; });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Legacy arity: name + handler passed by identifier
    {
      code: `
        ${IMPORT}
        server.tool('read_file', handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Computed key cannot declare the schema — still a finding
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { [key]: schema }, handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Non-matching literal key
    {
      code: `
        ${IMPORT}
        server.registerTool('read_file', { 'description': 'x' }, handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Registration ordered before the import — Program:exit makes order irrelevant
    {
      code: `
        server.registerTool('read_file', { description: 'x' }, handler);
        ${IMPORT}
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Non-literal tool name falls back to "unknown" in the message data
    {
      code: `
        ${IMPORT}
        server.registerTool(toolName, { description: 'x' }, handler);
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
  ],
});
