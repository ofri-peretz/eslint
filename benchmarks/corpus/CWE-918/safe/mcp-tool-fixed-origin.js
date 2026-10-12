// CWE-918: Safe — MCP tool keeps the request origin fixed in code
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the origin is a constant; the tool argument only
// fills an encoded path segment, so the host cannot change.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const API_ORIGIN = 'https://api.github.com';
const server = new McpServer({ name: 'github', version: '1.0.0' });

server.registerTool(
  'get_repo',
  {
    description: 'Read public metadata for a GitHub repository',
    inputSchema: { owner: z.string(), repo: z.string() },
  },
  async ({ owner, repo }) => {
    const target = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      API_ORIGIN,
    );
    const response = await fetch(target, { redirect: 'error' });
    return { content: [{ type: 'text', text: await response.text() }] };
  },
);

module.exports = { server };
