// GHSA-gjv4-ghm7-q58q — vulnerable: kubectl_describe builds a shell string from tool arguments
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-078
// @expected      vulnerable
// This MUST be detected
// GHSA-gjv4-ghm7-q58q: mcp-server-kubernetes < 2.5.0. Tool arguments concatenated
// into a kubectl shell string. Extracted from dist/tools/kubectl-describe.js.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execSync } from 'node:child_process';
import { z } from 'zod';

const server = new McpServer({ name: 'kubernetes', version: '2.4.9' });
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
    const resourceType = input.resourceType.toLowerCase();
    const name = input.name;
    const namespace = input.namespace || 'default';
    let command = 'kubectl describe ';
    command += resourceType;
    command += ` ${name}`;
    command += ` -n ${namespace}`;
    const result = execSync(command, { encoding: 'utf8' });
    return { content: [{ type: 'text', text: result }] };
  },
);
