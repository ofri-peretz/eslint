// CWE-020: MCP tool handler reads client arguments while no inputSchema is declared
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — with no inputSchema the SDK validates nothing and passes the
// request context where the handler expects arguments, so `path` and `encoding` are
// neither declared nor validated before they reach the filesystem.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { readFile } = require('node:fs/promises');

const server = new McpServer({ name: 'files', version: '1.0.0' });

server.registerTool(
  'read_file',
  { title: 'Read file', description: 'Read a file from the workspace' },
  async ({ path, encoding }) => ({
    content: [{ type: 'text', text: await readFile(path, encoding) }],
  }),
);

module.exports = { server };
