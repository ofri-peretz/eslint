const { tag } = require('../../lib.cjs');
const { SDK, indent } = require('../../mcp-sdk.cjs');

const TRANSPORTS = {
  V1: [
    `import { StreamableHTTPServerTransport } from '${SDK}/server/streamableHttp.js';`,
    'StreamableHTTPServerTransport',
  ],
  NodeV2: [
    "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';",
    'NodeStreamableHTTPServerTransport',
  ],
  WebV2: [
    "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';",
    'WebStandardStreamableHTTPServerTransport',
  ],
  LocalClass: [
    'class StreamableHTTPServerTransport {\n  constructor(readonly options?: object) {}\n  handleRequest(...a: unknown[]) {}\n}',
    'StreamableHTTPServerTransport',
  ],
};

/** Server kind -> [head, constructor expression]. */
const SERVERS = {
  HighLevel: [
    `import { McpServer } from '${SDK}/server/mcp.js';`,
    "new McpServer({ name: 'demo', version: '1.0.0' })",
  ],
  LowLevel: [
    `import { Server } from '${SDK}/server/index.js';`,
    "new Server({ name: 'demo', version: '1.0.0' }, { capabilities: { tools: {} } })",
  ],
  RequireHighLevel: [
    `const { McpServer: Mcp } = require('${SDK}/server/mcp.js');`,
    "new Mcp({ name: 'demo', version: '1.0.0' })",
  ],
  NotSdk: [
    `import { McpServer } from '${SDK}/server/mcp.js';\nimport { EventHub } from './hub';`,
    'new EventHub()',
  ],
};

const MODES = {
  Undefined: '{ sessionIdGenerator: undefined }',
  Omitted: '{ enableJsonResponse: true }',
  NoOptions: '',
  Cast: '{ sessionIdGenerator: undefined } as Record<string, unknown>',
  Stateful: '{ sessionIdGenerator: () => randomUUID() }',
  OptionsVar: 'transportOptions',
  Spread: '{ ...transportOptions }',
};

const HEAD =
  "import express from 'express';\nimport { randomUUID } from 'node:crypto';\nimport { getServer } from './server-factory';\nconst transportOptions = { sessionIdGenerator: undefined };\nconst app = express();\napp.use(express.json());";

const serve = (server) =>
  `res.on('close', () => transport.close());\nawait ${server}.connect(transport);\nawait transport.handleRequest(req, res, req.body);`;

module.exports = {
  rule: 'no-shared-stateless-transport',
  // Placements: 6 x 7 modes x 4 transports = 168. Servers: 2 x 2 x 4 = 16.
  domain: 184,
  traces: 2000,
  key: (s) =>
    [s.part, s.placement, s.mode, s.transport, s.serverKind].map(tag).join('|'),
  code: (s) => {
    const [tHead, cls] = TRANSPORTS[tag(s.transport)];
    const [sHead, ctor] = SERVERS[tag(s.serverKind)];
    const make = `new ${cls}(${MODES[tag(s.mode)]})`;
    let body;
    switch (tag(s.placement)) {
      case 'ModuleLevel':
        body = `const server = ${ctor};\nconst transport = ${make};\nawait server.connect(transport);\napp.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));`;
        break;
      case 'PerRequestSharedServer':
        body = `const server = ${ctor};\napp.post('/mcp', async (req, res) => {\n  const transport = ${make};\n${indent(serve('server'), 2)}\n});`;
        break;
      case 'PerRequestLocalServer':
        body = `app.post('/mcp', async (req, res) => {\n  const server = ${ctor};\n  const transport = ${make};\n${indent(serve('server'), 2)}\n});`;
        break;
      case 'PerRequestFactory':
        body = `app.post('/mcp', async (req, res) => {\n  const server = getServer();\n  const transport = ${make};\n${indent(serve('server'), 2)}\n});`;
        break;
      case 'MainClosure':
        body = `async function main() {\n  const server = ${ctor};\n  const transport = ${make};\n  await server.connect(transport);\n  app.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));\n}\nmain();`;
        break;
      case 'ClassField':
        body = `export class Gateway {\n  transport = ${make};\n  handle(req: any, res: any) {\n    return this.transport.handleRequest(req, res, req.body);\n  }\n}`;
        break;
      default:
        throw new Error(tag(s.placement));
    }
    return [sHead, tHead, HEAD, body].join('\n') + '\n';
  },
};
