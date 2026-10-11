// CWE-020: Safe — MCP tool declares the input schema its handler reads
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the SDK validates `path` and `encoding` against the
// declared Zod shape before the handler runs, and a zero-argument tool needs no schema.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { readFile } = require('node:fs/promises');
const { z } = require('zod');

const server = new McpServer({ name: 'files', version: '1.0.0' });

server.registerTool(
  'read_file',
  {
    title: 'Read file',
    description: 'Read a file from the workspace',
    inputSchema: {
      path: z.string().min(1),
      encoding: z.enum(['utf8', 'base64']).default('utf8'),
    },
  },
  async ({ path, encoding }) => ({
    content: [{ type: 'text', text: await readFile(path, encoding) }],
  }),
);

server.registerTool(
  'server_time',
  { title: 'Server time', description: 'Current server time in ISO-8601' },
  async () => ({ content: [{ type: 'text', text: new Date().toISOString() }] }),
);

module.exports = { server };
