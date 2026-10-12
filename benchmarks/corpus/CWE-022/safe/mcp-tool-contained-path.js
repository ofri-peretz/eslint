// CWE-022: Safe — MCP tool confines a client-chosen path to its root
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the requested name is reduced to its basename,
// so no directory component (`..`, `/`) survives, and it must also be one of
// the files the tool publishes before anything is read.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { readFile } = require('node:fs/promises');
const nodePath = require('node:path');
const { z } = require('zod');

const ROOT = '/srv/workspace';
const PUBLISHED = new Set(['README.md', 'CHANGELOG.md']);
const server = new McpServer({ name: 'files', version: '1.0.0' });

server.registerTool(
  'read_doc',
  {
    description: 'Read one of the published documents',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const file = nodePath.basename(name);
    if (!PUBLISHED.has(file)) {
      return { isError: true, content: [{ type: 'text', text: 'unknown document' }] };
    }
    return {
      content: [{ type: 'text', text: await readFile(nodePath.join(ROOT, file), 'utf8') }],
    };
  },
);

module.exports = { server };
