// GHSA-gxw4-4fc5-9gr5 — safe: execFile with an argument array, and regex-pinned fileKey and nodeId
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-078
// @expected      safe
// This must NOT be flagged
// Fixed shape (0.6.3): execFile with an argument array, and the tool schema pins
// fileKey and nodeId to strict patterns.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

async function fetchWithRetry(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    return await res.json();
  } catch {
    const args = ['-s', '-S', '--fail-with-body', '-L'];
    for (const [k, v] of Object.entries(options.headers || {}))
      args.push('-H', `${k}: ${v}`);
    args.push(url);
    const { stdout } = await execFileAsync('curl', args);
    return JSON.parse(stdout);
  }
}

const server = new McpServer({ name: 'figma', version: '0.6.3' });
server.registerTool(
  'get_figma_data',
  {
    description: 'Get Figma file data',
    inputSchema: {
      fileKey: z.string().regex(/^[a-zA-Z0-9]+$/),
      nodeId: z
        .string()
        .regex(/^I?\d+[:|-]\d+(?:;\d+[:|-]\d+)*$/)
        .optional(),
    },
  },
  async ({ fileKey, nodeId }) => {
    const endpoint = nodeId
      ? `/files/${fileKey}/nodes?ids=${nodeId}`
      : `/files/${fileKey}`;
    const data = await fetchWithRetry(`https://api.figma.com/v1${endpoint}`, {
      headers: { 'X-Figma-Token': process.env.FIGMA_API_KEY },
    });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  },
);
