// CWE-094: MCP "calculator" tool evaluates the tool argument as JavaScript
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `expression` comes from the model's tool call, and
// eval runs it with the server's privileges:
// `require('child_process').execSync('id')` is a valid "expression".
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const server = new McpServer({ name: 'calculator', version: '1.0.0' });

server.registerTool(
  'calculate',
  {
    description: 'Evaluate an arithmetic expression',
    inputSchema: { expression: z.string() },
  },
  async ({ expression }) => ({
    content: [{ type: 'text', text: String(eval(expression)) }],
  }),
);

module.exports = { server };
