// GHSA-4xqg-gf5c-ghwq — vulnerable: command.split(" ") feeds spawn(cmd, args)
// @author        claude-code
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// @cwe           CWE-088
// @expected      vulnerable
// This MUST be detected
// GHSA-4xqg-gf5c-ghwq: mcp-server-kubernetes <= 3.4.0. No shell, but the command is
// built as one string and split on spaces, so a tool argument containing spaces
// smuggles extra kubectl flags. Extracted from dist/tools/port_forward.js.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn } from 'node:child_process';
import { z } from 'zod';

function executeKubectlCommandAsync(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args);
    child.stdout.on('data', (d) => resolve(d.toString()));
    child.on('error', reject);
  });
}

const server = new McpServer({ name: 'kubernetes', version: '3.4.0' });
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
    let command = `kubectl port-forward`;
    if (input.namespace) command += ` -n ${input.namespace}`;
    command += ` ${input.resourceType}/${input.resourceName} ${input.localPort}:${input.targetPort}`;
    const result = await executeKubectlCommandAsync(command);
    return { content: [{ type: 'text', text: String(result) }] };
  },
);
