// Renders one state of models/mcp-sdk-security.no-command-injection-in-tool.plumbing.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { bind } from './_mcp.mjs';

export const plugin = 'mcp-sdk-security';
export const rule = 'no-command-injection-in-tool';
export const dimensions = ['sdk', 'api', 'read', 'schema', 'binding'];

const FIELD = {
  FreeString: 'z.string()',
  ClosedEnum: "z.enum(['ls', 'pwd'])",
};

/** The handler head, and the expression its body reads the argument as. */
function reader(api, read) {
  const root =
    api === 'SetRequestHandler' ? 'request.params.arguments' : 'args';
  const param = api === 'SetRequestHandler' ? 'request' : 'args';
  switch (read) {
    case 'Destructure':
      return api === 'SetRequestHandler'
        ? { param, pre: `  const { cmd } = ${root} as any;\n`, expr: 'cmd' }
        : { param: '{ cmd }', pre: '', expr: 'cmd' };
    case 'Member':
      return { param, pre: '', expr: `${root}.cmd` };
    case 'ZodParse':
      return {
        param,
        pre: `  const { cmd } = Args.parse(${root});\n`,
        expr: 'cmd',
      };
    default:
      return {
        param,
        pre: `  const r = Args.safeParse(${root});\n  if (!r.success) throw new Error('bad');\n`,
        expr: 'r.data.cmd',
      };
  }
}

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const field = FIELD[c.schema];
  const { param, pre, expr } = reader(c.api, c.read);
  const { top, body } = bind(c.binding, expr, (v) => `execSync(${v});`);
  const v1 = c.sdk === 'V1';
  const lines = [
    "import { execSync } from 'node:child_process';",
    "import { z } from 'zod';",
    `const Args = z.object({ cmd: ${field} });`,
  ];
  let head;
  if (c.api === 'SetRequestHandler') {
    lines.push(
      v1
        ? "import { Server } from '@modelcontextprotocol/sdk/server/index.js';\nimport { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';"
        : "import { Server } from '@modelcontextprotocol/server';",
      "const server = new Server({ name: 'x', version: '1.0.0' }, { capabilities: { tools: {} } });",
    );
    head = `server.setRequestHandler(${v1 ? 'CallToolRequestSchema' : "'tools/call'"}, async (${param}) => {`;
  } else {
    lines.push(
      v1
        ? "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';"
        : "import { McpServer } from '@modelcontextprotocol/server';",
      "const server = new McpServer({ name: 'x', version: '1.0.0' });",
    );
    const shape = `{ cmd: ${field} }`;
    head =
      c.api === 'LegacyTool'
        ? `server.tool('run', ${shape}, async (${param}) => {`
        : `server.registerTool('run', { inputSchema: ${v1 ? shape : `z.object(${shape})`} }, async (${param}) => {`;
  }
  lines.push(top, head, pre + body, '  return { content: [] };', '});', '');
  return lines.filter(Boolean).join('\n');
}
