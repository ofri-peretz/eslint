// CWE-078: MCP tool argument restricted to a closed set before the helper runs it
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This must NOT be detected — the Zod schema the handler parses with admits
// only two literal subcommands, and the helper passes the one chosen as an
// argv element of a fixed binary, with no shell.
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { z } = require('zod');
const { execFileSync } = require('node:child_process');

const StatusArgs = z.object({ view: z.enum(['status', 'branch']) });
const server = new Server(
  { name: 'git', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

function git(subcommand) {
  return execFileSync('git', [subcommand]).toString();
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { view } = StatusArgs.parse(request.params.arguments);
  return { content: [{ type: 'text', text: git(view) }] };
});

module.exports = { server };
