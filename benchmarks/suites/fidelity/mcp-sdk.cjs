/**
 * Shared spellings for the mcp-sdk-security models (`models/mcp-sdk-security/`).
 *
 * Every rule in eslint-plugin-mcp-sdk-security is gated on the file importing
 * an MCP package, and the tool-handler rules read a tool's arguments from the
 * shape its registration gives them. So each tool model samples how real code
 * gets a server and registers a tool on it:
 *
 * Gates (how the server is obtained):
 *   - `Esm`        `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'`
 *   - `Require`    the same through `require(...)`
 *   - `Namespace`  `import * as mcp from '...'`, `new mcp.McpServer(...)`
 *   - `V2`         SDK v2, `@modelcontextprotocol/server`, `z.object` schemas
 *   - `McpHandler` Vercel's `mcp-handler`: the server is a callback parameter
 *   - `Lookalike`  an `McpServer` from a relative module: always silent
 *   - `None`       no import at all, `server` is just a value: always silent
 *
 * Registrations (where the handler's arguments come from):
 *   - `Register`   `registerTool(name, { inputSchema }, async ({ x }) => ...)`
 *   - `WholeArgs`  the same with `async (args) => ... args.x`
 *   - `Legacy`     `tool(name, description, shape, async ({ x }) => ...)` (v1 only)
 *   - `Named`      a same-file `async function` passed by name
 *   - `LowLevel`   `Server.setRequestHandler(CallToolRequestSchema, ...)` reading
 *                  `request.params.arguments` (v2: the `'tools/call'` method)
 *   - `Enum`       `registerTool` whose schema is `z.enum([...])`: an allowlist
 *   - `ResTemplate` `registerResource(name, new ResourceTemplate(...), {}, (uri, { x }) => ...)`
 *   - `ResStatic`  a resource with a fixed URI: its `uri` is not client-chosen
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

const SDK = '@modelcontextprotocol/sdk';

/** Gate tag -> how the file obtains its server (high-level and low-level). */
const GATES = {
  Esm: {
    head: `import { McpServer } from '${SDK}/server/mcp.js';`,
    zod: "import { z } from 'zod';",
    decl: "const server = new McpServer({ name: 'demo', version: '1.0.0' });",
    low: {
      head: `import { Server } from '${SDK}/server/index.js';\nimport { CallToolRequestSchema } from '${SDK}/types.js';`,
      decl: "const server = new Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } });",
      method: 'CallToolRequestSchema',
    },
    template: `import { McpServer, ResourceTemplate } from '${SDK}/server/mcp.js';`,
  },
  Require: {
    head: `const { McpServer } = require('${SDK}/server/mcp.js');`,
    zod: "const { z } = require('zod');",
    decl: "const server = new McpServer({ name: 'demo', version: '1.0.0' });",
    low: {
      head: `const { Server } = require('${SDK}/server/index.js');\nconst { CallToolRequestSchema } = require('${SDK}/types.js');`,
      decl: "const server = new Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } });",
      method: 'CallToolRequestSchema',
    },
    template: `const { McpServer, ResourceTemplate } = require('${SDK}/server/mcp.js');`,
  },
  Namespace: {
    head: `import * as mcp from '${SDK}/server/mcp.js';`,
    zod: "import * as z from 'zod';",
    decl: "const server = new mcp.McpServer({ name: 'demo', version: '1.0.0' });",
    low: {
      head: `import * as sdk from '${SDK}/server/index.js';\nimport * as types from '${SDK}/types.js';`,
      decl: "const server = new sdk.Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } });",
      method: 'types.CallToolRequestSchema',
    },
    template: `import * as mcp from '${SDK}/server/mcp.js';`,
    templateClass: 'mcp.ResourceTemplate',
  },
  V2: {
    head: "import { McpServer } from '@modelcontextprotocol/server';",
    zod: "import { z } from 'zod';",
    decl: "const server = new McpServer({ name: 'demo', version: '1.0.0' });",
    v2: true,
    low: {
      head: "import { Server } from '@modelcontextprotocol/server';",
      decl: "const server = new Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } });",
      method: "'tools/call'",
    },
    template:
      "import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';",
  },
  McpHandler: {
    head: "import { createMcpHandler } from 'mcp-handler';",
    zod: "import { z } from 'zod';",
    wrap: true,
    template: `import { createMcpHandler } from 'mcp-handler';\nimport { ResourceTemplate } from '${SDK}/server/mcp.js';`,
  },
  Lookalike: {
    head: "import { McpServer } from './mcp-server';",
    zod: "import { z } from 'zod';",
    decl: "const server = new McpServer({ name: 'demo', version: '1.0.0' });",
    low: {
      head: "import { Server, CallToolRequestSchema } from './rpc';",
      decl: "const server = new Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } });",
      method: 'CallToolRequestSchema',
    },
    template: "import { McpServer, ResourceTemplate } from './mcp-server';",
  },
  None: {
    head: 'declare function createServer(): any;',
    zod: "import { z } from 'zod';",
    decl: 'const server = createServer();',
    low: {
      head: 'declare function createServer(): any;\ndeclare const CallToolRequestSchema: unknown;',
      decl: 'const server = createServer();',
      method: 'CallToolRequestSchema',
    },
    template:
      'declare function createServer(): any;\ndeclare class ResourceTemplate { constructor(t: string, o: unknown); }',
  },
};

const isMcpGate = (g) => g !== 'Lookalike' && g !== 'None';

/** Registration/gate pairs that do not exist in real code. */
const validReg = (g, r) =>
  !(g === 'V2' && r === 'Legacy') && !(g === 'McpHandler' && r === 'LowLevel');

const indent = (s, n) =>
  s
    .split('\n')
    .map((l) => (l ? ' '.repeat(n) + l : l))
    .join('\n');

/**
 * A whole server file registering one tool (or resource) whose argument `arg`
 * reaches `body(access)`. `access` is the expression that reads the argument
 * in that registration's spelling; `body` returns statements, and the handler
 * then returns an empty result. `imports` and `pre` go before the server.
 */
function toolProgram(
  gate,
  reg,
  body,
  { arg = 'x', imports = '', pre = '', enumValues = "'a', 'b'" } = {},
) {
  const G = GATES[gate];
  const low = reg === 'LowLevel';
  const isTemplate = reg === 'ResTemplate' || reg === 'ResStatic';
  const head = low ? G.low.head : isTemplate ? G.template : G.head;
  const decl = low ? G.low.decl : G.decl;
  const fieldSchema = reg === 'Enum' ? `z.enum([${enumValues}])` : 'z.string()';
  const shape = `{ ${arg}: ${fieldSchema} }`;
  const schema = G.v2 ? `z.object(${shape})` : shape;
  const done = 'return { content: [] };';
  const handler = (param, access) =>
    `async (${param}) => {\n${indent(body(access), 2)}\n  ${done}\n}`;
  let registration;
  switch (reg) {
    case 'Register':
    case 'Enum':
      registration = `server.registerTool('run', { description: 'Run it', inputSchema: ${schema} }, ${handler(`{ ${arg} }`, arg)});`;
      break;
    case 'WholeArgs':
      registration = `server.registerTool('run', { description: 'Run it', inputSchema: ${schema} }, ${handler('args', `args.${arg}`)});`;
      break;
    case 'Legacy':
      registration = `server.tool('run', 'Run it', ${shape}, ${handler(`{ ${arg} }`, arg)});`;
      break;
    case 'Named':
      registration = `async function runTool({ ${arg} }: { ${arg}: string }) {\n${indent(body(arg), 2)}\n  ${done}\n}\nserver.registerTool('run', { description: 'Run it', inputSchema: ${schema} }, runTool);`;
      break;
    case 'LowLevel':
      registration = `server.setRequestHandler(${G.low.method}, async (request: any) => {\n  const ${arg} = String(request.params.arguments?.${arg});\n${indent(body(arg), 2)}\n  ${done}\n});`;
      break;
    case 'ResTemplate': {
      const cls = G.templateClass ?? 'ResourceTemplate';
      registration = `server.registerResource('doc', new ${cls}('docs://{${arg}}', { list: undefined }), {}, async (uri: any, { ${arg} }: any) => {\n${indent(body(arg), 2)}\n  return { contents: [] };\n});`;
      break;
    }
    case 'ResStatic':
      registration = `server.registerResource('doc', 'docs://readme', {}, async (uri: any) => {\n  const ${arg} = uri.pathname;\n${indent(body(arg), 2)}\n  return { contents: [] };\n});`;
      break;
    default:
      throw new Error(`unknown registration ${reg}`);
  }
  const serverPart = G.wrap
    ? `export const handler = createMcpHandler((server: any) => {\n${indent(registration, 2)}\n});`
    : `${decl}\n${registration}`;
  return (
    [head, G.zod, imports, pre, serverPart].filter(Boolean).join('\n') + '\n'
  );
}

module.exports = { SDK, GATES, isMcpGate, validReg, toolProgram, indent };
