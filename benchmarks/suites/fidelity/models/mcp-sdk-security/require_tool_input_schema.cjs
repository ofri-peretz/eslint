const { tag } = require('../../lib.cjs');
const { GATES, indent } = require('../../mcp-sdk.cjs');

/** Handler tag -> [pre statements, handler expression]. */
const HANDLERS = {
  NoParams: [
    '',
    "async () => ({ content: [{ type: 'text', text: new Date().toISOString() }] })",
  ],
  DestructuredArg: [
    '',
    "async ({ path }: any) => ({ content: [{ type: 'text', text: readFileSync(path, 'utf8') }] })",
  ],
  DestructuredContext: [
    '',
    "async ({ signal, sessionId }: any) => ({ content: [{ type: 'text', text: String(signal.aborted) + sessionId }] })",
  ],
  DestructuredAuthInfo: [
    '',
    "async ({ authInfo, _meta }: any) => ({ content: [{ type: 'text', text: String(authInfo?.clientId) + String(_meta) }] })",
  ],
  MemberArg: ['', 'async (args: any) => db.delete(args.id)'],
  MemberContext: [
    '',
    "async (extra: any) => ({ content: [{ type: 'text', text: String(extra.requestInfo?.headers) }] })",
  ],
  SecondParam: [
    '',
    "async (args: any, extra: any) => ({ content: [{ type: 'text', text: String(extra.sessionId) }] })",
  ],
  UnusedParam: [
    '',
    "async (_extra: any) => ({ content: [{ type: 'text', text: 'pong' }] })",
  ],
  NamedFnArg: [
    "async function readHandler({ path }: any) {\n  return { content: [{ type: 'text', text: readFileSync(path, 'utf8') }] };\n}",
    'readHandler',
  ],
  ImportedHandler: [
    "import { readHandler as importedRead } from './handlers';",
    'importedRead',
  ],
};

/** Registration tag -> (gate, handler) => code. */
const REGS = {
  RegisterNoSchema: (G, h) =>
    `server.registerTool('read_file', { description: 'Read a file' }, ${h});`,
  RegisterSchema: (G, h) =>
    `server.registerTool('read_file', { description: 'Read a file', inputSchema: ${G.v2 ? 'z.object({ path: z.string(), id: z.string() })' : '{ path: z.string(), id: z.string() }'} }, ${h});`,
  RegisterZObject: (G, h) =>
    `server.registerTool('read_file', { inputSchema: z.object({ path: z.string(), id: z.string() }) }, ${h});`,
  LegacyBare: (G, h) => `server.tool('read_file', ${h});`,
  LegacyDescription: (G, h) => `server.tool('read_file', 'Read a file', ${h});`,
  LegacyAnnotations: (G, h) =>
    `server.tool('read_file', 'Read a file', { readOnlyHint: true, title: 'Read' }, ${h});`,
  LegacyShape: (G, h) =>
    `server.tool('read_file', 'Read a file', { path: z.string(), id: z.string() }, ${h});`,
  ConfigByRef: (G, h) => `server.registerTool('read_file', toolConfig, ${h});`,
  ConfigSpread: (G, h) =>
    `server.registerTool('read_file', { ...baseConfig, description: 'Read a file' }, ${h});`,
};

module.exports = {
  rule: 'require-tool-input-schema',
  // Handlers: 9 registrations x 10 handlers = 90.
  // Wiring: (6 gates x 2 registrations - V2's legacy) x 2 handlers = 22.
  domain: 112,
  traces: 1300,
  key: (s) => [s.part, s.gate, s.reg, s.handler].map(tag).join('|'),
  code: (s) => {
    const G = GATES[tag(s.gate)];
    const [pre, h] = HANDLERS[tag(s.handler)];
    const imports = pre.startsWith('import') ? pre : '';
    const local = pre.startsWith('import') ? '' : pre;
    const reg = [local, REGS[tag(s.reg)](G, h)].filter(Boolean).join('\n');
    const common = [
      "import { readFileSync } from 'node:fs';",
      "import { db } from './db';",
      "import { toolConfig, baseConfig } from './tool-config';",
    ].join('\n');
    const serverPart = G.wrap
      ? `export const handler = createMcpHandler((server: any) => {\n${indent(reg, 2)}\n});`
      : `${G.decl}\n${reg}`;
    return (
      [G.head, G.zod, common, imports, serverPart].filter(Boolean).join('\n') +
      '\n'
    );
  },
};
