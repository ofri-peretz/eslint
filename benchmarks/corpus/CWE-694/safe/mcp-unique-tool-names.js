// CWE-694: Safe — each tool has its own name, and alternatives are chosen by if/else
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — `build_status` and `deploy` are distinct names, and the
// two `deploy` registrations are alternatives: exactly one branch runs, so one
// server never registers the name twice.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

function createServer(requireApproval) {
  const server = new McpServer({ name: 'release', version: '1.0.0' });

  server.registerTool(
    'build_status',
    { description: 'Status of a build', inputSchema: { build: z.string() } },
    async ({ build }) => ({ content: [{ type: 'text', text: `${build}: ok` }] }),
  );

  if (requireApproval) {
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
  } else {
    server.registerTool(
      'deploy',
      { description: 'Deploy a build', inputSchema: { build: z.string() } },
      async ({ build }) => ({ content: [{ type: 'text', text: `deploying ${build}` }] }),
    );
  }
  return server;
}

module.exports = { createServer };
