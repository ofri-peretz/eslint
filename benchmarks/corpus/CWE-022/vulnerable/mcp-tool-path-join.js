// CWE-022: MCP tool joins a client-chosen path onto its root and reads it
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `path` comes from the model's tool call, and
// `path.join(ROOT, '../../.ssh/id_rsa')` resolves outside ROOT. The EscapeRoute
// class (CVE-2025-53109 / CVE-2025-53110): nothing confines the joined path.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { readFile } = require('node:fs/promises');
const nodePath = require('node:path');
const { z } = require('zod');

const ROOT = '/srv/workspace';
const server = new McpServer({ name: 'files', version: '1.0.0' });

server.registerTool(
  'read_file',
  {
    description: 'Read a file from the workspace',
    inputSchema: { path: z.string() },
  },
  async ({ path }) => ({
    content: [
      { type: 'text', text: await readFile(nodePath.join(ROOT, path), 'utf8') },
    ],
  }),
);

module.exports = { server };
