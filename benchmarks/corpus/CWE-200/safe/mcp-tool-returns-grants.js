// CWE-200: Safe — MCP tool reports what the caller's token grants, not the token
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the result carries the client id and scopes the
// SDK verified, never the bearer token itself or the server's environment.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

const server = new McpServer({ name: 'account', version: '1.0.0' });

server.registerTool(
  'whoami',
  { description: 'Describe the authenticated client' },
  async (extra) => ({
    content: [
      {
        type: 'text',
        text: `${extra.authInfo?.clientId}: ${(extra.authInfo?.scopes ?? []).join(', ')}`,
      },
    ],
  }),
);

module.exports = { server };
