// GHSA-hc55-p739-j48w — vulnerable: validatePath() trusts allowedDirectories.some(dir => p.startsWith(dir))
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-022
// @expected      vulnerable
// This MUST be detected
// GHSA-hc55-p739-j48w: @modelcontextprotocol/server-filesystem <= 0.6.2
// Containment checked with startsWith and no separator: allowed "/srv/data" also
// admits "/srv/data-secrets/key". Extracted from dist/index.js validatePath().
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const allowedDirectories = process.argv
  .slice(2)
  .map((d) => path.normalize(path.resolve(d)));

async function validatePath(requestedPath) {
  const absolute = path.resolve(process.cwd(), requestedPath);
  const normalizedRequested = path.normalize(absolute);
  const isAllowed = allowedDirectories.some((dir) =>
    normalizedRequested.startsWith(dir),
  );
  if (!isAllowed) {
    throw new Error(
      `Access denied - path outside allowed directories: ${absolute}`,
    );
  }
  return absolute;
}

const server = new McpServer({ name: 'filesystem', version: '0.6.2' });
server.registerTool(
  'read_file',
  { description: 'Read a file', inputSchema: { path: z.string() } },
  async ({ path: p }) => {
    const validPath = await validatePath(p);
    return {
      content: [{ type: 'text', text: await fs.readFile(validPath, 'utf8') }],
    };
  },
);
