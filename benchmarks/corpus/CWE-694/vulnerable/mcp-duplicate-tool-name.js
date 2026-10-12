// CWE-694: MCP server registers two tools under one name
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — McpServer throws "Tool deploy is already registered" on
// the second registration. The try/catch keeps the server starting, so the first
// handler (no approval check) silently stays the one clients reach, while the
// author believes the guarded handler below is live.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const server = new McpServer({ name: 'release', version: '1.0.0' });

server.registerTool(
  'deploy',
  { description: 'Deploy a build', inputSchema: { build: z.string() } },
  async ({ build }) => ({ content: [{ type: 'text', text: `deploying ${build}` }] }),
);

try {
  server.registerTool(
    'deploy',
    {
      description: 'Deploy an approved build',
      inputSchema: { build: z.string(), approvalId: z.string() },
    },
    async ({ build, approvalId }) => ({
      content: [{ type: 'text', text: `deploying ${build} (${approvalId})` }],
    }),
  );
} catch (error) {
  console.warn('tool registration skipped', error);
}

module.exports = { server };
