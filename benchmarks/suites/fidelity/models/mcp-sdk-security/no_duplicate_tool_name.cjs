const { tag } = require('../../lib.cjs');
const { SDK, indent } = require('../../mcp-sdk.cjs');

/** Gate tag -> [high-level head, low-level head + list method]. */
const HEADS = {
  Esm: [
    `import { McpServer } from '${SDK}/server/mcp.js';`,
    `import { Server } from '${SDK}/server/index.js';\nimport { ListToolsRequestSchema } from '${SDK}/types.js';`,
    'ListToolsRequestSchema',
  ],
  Require: [
    `const { McpServer } = require('${SDK}/server/mcp.js');`,
    `const { Server } = require('${SDK}/server/index.js');\nconst { ListToolsRequestSchema } = require('${SDK}/types.js');`,
    'ListToolsRequestSchema',
  ],
  V2: [
    "import { McpServer } from '@modelcontextprotocol/server';",
    "import { Server, ListToolsRequestSchema } from '@modelcontextprotocol/server';",
    'ListToolsRequestSchema',
  ],
  Lookalike: [
    "import { McpServer } from './mcp-server';",
    "import { Server, ListToolsRequestSchema } from './rpc';",
    'ListToolsRequestSchema',
  ],
  None: [
    'declare class McpServer { constructor(o: unknown); registerTool(...a: unknown[]): void; tool(...a: unknown[]): void; }',
    'declare class Server { constructor(...o: unknown[]); setRequestHandler(...a: unknown[]): void; }\ndeclare const ListToolsRequestSchema: unknown;',
    'ListToolsRequestSchema',
  ],
};

const reg = (form, recv, name, handler) =>
  form === 'RegisterTool'
    ? `${recv}.registerTool(${name}, { description: 'Search' }, ${handler});`
    : `${recv}.tool(${name}, 'Search', ${handler});`;

const NAMES = {
  Same: ["'search'", "'search'"],
  Different: ["'search_docs'", "'search_code'"],
  ConstSame: ['TOOL_NAME', "'search'"],
  Dynamic: ['`search_${scope}`', '`search_${scope}`'],
};

/** Placement tag -> (first, second) => statements. */
const PLACEMENTS = {
  Sequential: (a, b) => `${a}\n${b}`,
  InTry: (a, b) => `${a}\ntry {\n  ${b}\n} catch (e) {\n  console.error(e);\n}`,
  IfElse: (a, b) => `if (readOnly) {\n  ${a}\n} else {\n  ${b}\n}`,
  IfSecond: (a, b) => `${a}\nif (readOnly) {\n  ${b}\n}`,
  InCatch: (a, b) => `try {\n  ${a}\n} catch (e) {\n  ${b}\n}`,
  InLoop: (a, b) => `${a}\nfor (const variant of variants) {\n  ${b}\n}`,
  TwoFunctions: (a, b) =>
    `function registerRead() {\n  ${a}\n}\nfunction registerWrite() {\n  ${b}\n}`,
  AndRight: (a, b) => `${a}\nreadOnly && ${b.replace(/;$/, '')};`,
  TernaryBranches: (a, b) =>
    `readOnly ? ${a.replace(/;$/, '')} : ${b.replace(/;$/, '')};`,
  SwitchCases: (a, b) =>
    `switch (mode) {\n  case 'read':\n    ${a}\n    break;\n  default:\n    ${b}\n}`,
  InnerBlock: (a, b) => `${a}\n{\n  ${b}\n}`,
};

const LISTINGS = {
  InlineDup: (m) =>
    `server.setRequestHandler(${m}, async () => ({\n  tools: [\n    { name: 'query', description: 'Read-only query', inputSchema },\n    { name: 'query', description: 'Run any SQL', inputSchema },\n  ],\n}));`,
  InlineDistinct: (m) =>
    `server.setRequestHandler(${m}, async () => ({\n  tools: [\n    { name: 'query', description: 'Read-only query', inputSchema },\n    { name: 'execute', description: 'Run any SQL', inputSchema },\n  ],\n}));`,
  ConstArrayDup: (m) =>
    `const TOOLS = [\n  { name: 'query', description: 'Read-only query', inputSchema },\n  { name: 'query', description: 'Run any SQL', inputSchema },\n];\nserver.setRequestHandler(${m}, async () => ({ tools: TOOLS }));`,
  ConstElemsDup: (m) =>
    `const READ = { name: 'query', description: 'Read-only query', inputSchema };\nconst WRITE = { name: 'query', description: 'Run any SQL', inputSchema };\nserver.setRequestHandler(${m}, async () => ({ tools: [READ, WRITE] }));`,
  Mapped: (m) =>
    `const TOOLS = { query: { description: 'Read-only query' }, execute: { description: 'Run any SQL' } };\nserver.setRequestHandler(${m}, async () => ({\n  tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema })),\n}));`,
  V2StringDup: () =>
    `server.setRequestHandler('tools/list', async () => ({\n  tools: [\n    { name: 'query', description: 'Read-only query', inputSchema },\n    { name: 'query', description: 'Run any SQL', inputSchema },\n  ],\n}));`,
  NamedHandlerDup: (m) =>
    `async function listTools() {\n  return {\n    tools: [\n      { name: 'query', description: 'Read-only query', inputSchema },\n      { name: 'query', description: 'Run any SQL', inputSchema },\n    ],\n  };\n}\nserver.setRequestHandler(${m}, listTools);`,
};

const PRE =
  "declare const readOnly: boolean;\ndeclare const mode: string;\ndeclare const scope: string;\ndeclare const variants: string[];\nconst TOOL_NAME = 'search';\nconst handler = async () => ({ content: [] });";

module.exports = {
  rule: 'no-duplicate-tool-name',
  // Registrations: 2 x 2 forms x 4 names x 11 placements = 176.
  // Receivers: 3. Listings: 7 x 5 gates = 35. Gates: 5.
  domain: 219,
  traces: 2600,
  key: (s) =>
    [
      s.part,
      s.form1,
      s.form2,
      s.name,
      s.placement,
      s.receiver,
      s.listing,
      s.gate,
    ]
      .map(tag)
      .join('|'),
  code: (s) => {
    const gate = tag(s.gate);
    const [head, lowHead, method] = HEADS[gate];
    if (tag(s.part) === 'Listings') {
      return `${lowHead}\n${PRE}\nconst inputSchema = { type: 'object' as const };\nconst server = new Server({ name: 'db', version: '1.0.0' }, { capabilities: { tools: {} } });\n${LISTINGS[tag(s.listing)](method)}\n`;
    }
    const [n1, n2] = NAMES[tag(s.name)];
    const recv = tag(s.receiver);
    if (recv === 'ThisServer') {
      return `${head}\n${PRE}\nexport class Tools {\n  private server = new McpServer({ name: 'demo', version: '1.0.0' });\n  register() {\n${indent(`${reg('RegisterTool', 'this.server', "'search'", 'handler')}\n${reg('RegisterTool', 'this.server', "'search'", 'handler')}`, 4)}\n  }\n}\n`;
    }
    const second = recv === 'TwoServers' ? 'admin' : 'server';
    const a = reg(tag(s.form1), 'server', n1, 'handler');
    const b = reg(tag(s.form2), second, n2, 'handler');
    return `${head}\n${PRE}\nconst server = new McpServer({ name: 'demo', version: '1.0.0' });\nconst admin = new McpServer({ name: 'admin', version: '1.0.0' });\n${PLACEMENTS[tag(s.placement)](a, b)}\n`;
  },
};
