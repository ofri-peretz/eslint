// GHSA-hc55-p739-j48w — safe: Containment is p === dir || p.startsWith(dir + path.sep)
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-022
// @expected      safe
// This must NOT be flagged
// Fixed shape (2025.7.1, path-validation.js): containment means equal to the root
// or below root + separator, so a sibling that shares the prefix is rejected.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const allowedDirectories = process.argv
  .slice(2)
  .map((d) => path.normalize(path.resolve(d)));

function isPathWithinAllowedDirectories(absolutePath, dirs) {
  const normalizedPath = path.normalize(path.resolve(absolutePath));
  return dirs.some(
    (dir) =>
      normalizedPath === dir || normalizedPath.startsWith(dir + path.sep),
  );
}

async function validatePath(requestedPath) {
  const absolute = path.resolve(process.cwd(), requestedPath);
  if (!isPathWithinAllowedDirectories(absolute, allowedDirectories)) {
    throw new Error(
      `Access denied - path outside allowed directories: ${absolute}`,
    );
  }
  return absolute;
}

const server = new McpServer({ name: 'filesystem', version: '2025.7.1' });
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
