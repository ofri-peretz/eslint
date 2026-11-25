// GHSA-4xqg-gf5c-ghwq — safe: Arguments built as an array, one element per value
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-088
// @expected      safe
// This must NOT be flagged
// Fixed shape (3.5.0): arguments built as an array, one element per value.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn } from 'node:child_process';
import { z } from 'zod';

function executePortForward(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('kubectl', args);
    child.stdout.on('data', (d) => resolve(d.toString()));
    child.on('error', reject);
  });
}

const server = new McpServer({ name: 'kubernetes', version: '3.5.0' });
server.registerTool(
  'port_forward',
  {
    description: 'Forward a port',
    inputSchema: {
      resourceType: z.string(),
      resourceName: z.string(),
      localPort: z.number(),
      targetPort: z.number(),
      namespace: z.string().optional(),
    },
  },
  async (input) => {
    const args = ['port-forward'];
    if (input.namespace) args.push('-n', input.namespace);
    args.push(
      `${input.resourceType}/${input.resourceName}`,
      `${input.localPort}:${input.targetPort}`,
    );
    const result = await executePortForward(args);
    return { content: [{ type: 'text', text: String(result) }] };
  },
);
