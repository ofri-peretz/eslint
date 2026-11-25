// GHSA-gjv4-ghm7-q58q — safe: execFileSync("kubectl", args) with one array element per value
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-078
// @expected      safe
// This must NOT be flagged
// Fixed shape (2.5.0): execFileSync with an argument array; no shell.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';

const server = new McpServer({ name: 'kubernetes', version: '2.5.0' });
server.registerTool(
  'kubectl_describe',
  {
    description: 'Describe a resource',
    inputSchema: {
      resourceType: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
    },
  },
  async (input) => {
    const args = [
      'describe',
      input.resourceType.toLowerCase(),
      input.name,
      '-n',
      input.namespace || 'default',
    ];
    const result = execFileSync('kubectl', args, { encoding: 'utf8' });
    return { content: [{ type: 'text', text: result }] };
  },
);
