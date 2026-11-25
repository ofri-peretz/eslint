// GHSA-gxw4-4fc5-9gr5 — vulnerable: Curl fallback interpolates the tool-derived URL into exec()
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-078
// @expected      vulnerable
// This MUST be detected
// GHSA-gxw4-4fc5-9gr5: figma-developer-mcp <= 0.6.2. The get_figma_data tool's
// fileKey reaches a shell string in the curl fallback. Extracted from dist chunk.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

async function fetchWithRetry(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    return await res.json();
  } catch {
    const headers = Object.entries(options.headers || {}).map(
      ([k, v]) => `-H "${k}: ${v}"`,
    );
    const curlCommand = `curl -s -S --fail-with-body -L ${headers.join(' ')} "${url}"`;
    const { stdout } = await execAsync(curlCommand);
    return JSON.parse(stdout);
  }
}

const server = new McpServer({ name: 'figma', version: '0.6.2' });
server.registerTool(
  'get_figma_data',
  {
    description: 'Get Figma file data',
    inputSchema: { fileKey: z.string(), nodeId: z.string().optional() },
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
