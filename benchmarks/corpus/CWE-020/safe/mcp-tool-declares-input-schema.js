// CWE-020: Safe — MCP tool declares the input schema its handler reads
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the SDK validates `path` and `encoding` against the
// declared Zod shape before the handler runs, the handler confines the canonical
// path to the workspace root (no `..`, absolute path or symlink escape), and a
// zero-argument tool needs no schema.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { readFile, realpath } = require('node:fs/promises');
const nodePath = require('node:path');
const { z } = require('zod');

const WORKSPACE_ROOT = nodePath.resolve(
  process.env.WORKSPACE_ROOT ?? process.cwd(),
);

/** The canonical path of `requested`, or a thrown error if it leaves the workspace. */
async function insideWorkspace(requested) {
  const root = await realpath(WORKSPACE_ROOT);
  const target = await realpath(nodePath.resolve(root, requested));
  const relative = nodePath.relative(root, target);
  const escapes =
    relative === '..' ||
    relative.startsWith(`..${nodePath.sep}`) ||
    nodePath.isAbsolute(relative);
  if (escapes) {
    throw new Error('Path is outside the workspace');
  }
  return target;
}

const server = new McpServer({ name: 'files', version: '1.0.0' });

server.registerTool(
  'read_file',
  {
    title: 'Read file',
    description: 'Read a file from the workspace',
    inputSchema: {
      path: z.string().min(1),
      encoding: z.enum(['utf8', 'base64']).default('utf8'),
    },
  },
  async ({ path, encoding }) => ({
    content: [
      {
        type: 'text',
        text: await readFile(await insideWorkspace(path), encoding),
      },
    ],
  }),
);

server.registerTool(
  'server_time',
  { title: 'Server time', description: 'Current server time in ISO-8601' },
  async () => ({ content: [{ type: 'text', text: new Date().toISOString() }] }),
);

module.exports = { server };
