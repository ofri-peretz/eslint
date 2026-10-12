// CWE-200: MCP tool forwards the caller's bearer token to another API
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `authInfo.token` is the token this MCP server
// received. The MCP authorization spec forbids passing it through: GitHub then
// trusts a token that was never issued for it (a confused deputy).
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

const server = new McpServer({ name: 'github-proxy', version: '1.0.0' });

server.registerTool(
  'list_repos',
  { description: 'List the caller repositories' },
  async (extra) => {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${extra.authInfo.token}` },
    });
    return { content: [{ type: 'text', text: await response.text() }] };
  },
);

module.exports = { server };
