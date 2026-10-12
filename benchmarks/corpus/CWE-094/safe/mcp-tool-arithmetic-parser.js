// CWE-094: Safe — MCP calculator tool accepts only a fixed operation set
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — nothing is evaluated as code: the operator is a
// closed z.enum set mapped to functions the server owns, and the operands are
// numbers the SDK validated.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const OPERATIONS = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
};

const server = new McpServer({ name: 'calculator', version: '1.0.0' });

server.registerTool(
  'calculate',
  {
    description: 'Apply one arithmetic operation to two numbers',
    inputSchema: {
      operation: z.enum(['add', 'subtract', 'multiply']),
      a: z.number(),
      b: z.number(),
    },
  },
  async ({ operation, a, b }) => ({
    content: [{ type: 'text', text: String(OPERATIONS[operation](a, b)) }],
  }),
);

module.exports = { server };
