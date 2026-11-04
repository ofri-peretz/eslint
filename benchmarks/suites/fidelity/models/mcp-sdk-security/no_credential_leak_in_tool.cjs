const { tag } = require('../../lib.cjs');
const { GATES, indent } = require('../../mcp-sdk.cjs');

const text = (v) => `return { content: [{ type: 'text', text: ${v} }] };`;
const done = "return { content: [{ type: 'text', text: 'ok' }] };";

/** Shape tag -> [imports, body(tokenExpr, authInfoExpr)]. */
const SHAPES = {
  EnvStringify: ['', () => text('JSON.stringify(process.env, null, 2)')],
  EnvSpread: ['', () => text('JSON.stringify({ ...process.env })')],
  EnvEntries: [
    '',
    () =>
      text(
        "Object.entries(process.env).map(([k, v]) => `${k}=${v}`).join('\\n')",
      ),
  ],
  EnvIndexArg: ['', () => text('String(process.env[q])')],
  EnvViaBinding: [
    '',
    () => `const config = process.env;\n${text('JSON.stringify(config)')}`,
  ],
  NodeProcessEnv: [
    "import { env } from 'node:process';",
    () => text('JSON.stringify(env)'),
  ],
  NodeProcessDefault: [
    "import proc from 'node:process';",
    () => text('JSON.stringify(proc.env)'),
  ],
  RequireProcessEnv: [
    "const { env: environment } = require('node:process');",
    () => text('JSON.stringify(environment)'),
  ],
  EnvDestructured: [
    '',
    () => `const { env } = process;\n${text('JSON.stringify(env)')}`,
  ],
  EnvDestructuredDefault: [
    '',
    () => `const { env = {} } = process;\n${text('JSON.stringify(env)')}`,
  ],
  EnvNamedKey: [
    "import { env } from 'node:process';",
    () =>
      `const settings = { env: 'production', debug: String(env.DEBUG) };\nreturn { env: settings.env, content: [{ type: 'text', text: settings.debug }] };`,
  ],
  EnvNamed: ['', () => text("process.env.NODE_ENV ?? 'development'")],
  EnvKeys: ['', () => text("Object.keys(process.env).join(', ')")],
  EnvIndexConst: ['', () => text('String(process.env[LOG_KEY])')],
  ShadowedProcess: [
    '',
    () =>
      `const process = { env: { mode: 'demo' } };\n${text('JSON.stringify(process.env)')}`,
  ],
  TokenResult: ['', (tok) => text(`${tok} ?? ''`)],
  TokenTemplate: ['', (tok) => text(`\`token: \${${tok}}\``)],
  AuthInfoStringify: ['', (tok, ai) => text(`JSON.stringify(${ai})`)],
  ClientIdResult: ['', (tok, ai) => text(`String(${ai}?.clientId)`)],
  ScopesResult: ['', (tok, ai) => text(`(${ai}?.scopes ?? []).join(', ')`)],
  TokenFetch: [
    '',
    (tok) =>
      `const res = await fetch('https://api.github.com/user/repos', {\n  headers: { Authorization: \`Bearer \${${tok}}\` },\n});\n${text('await res.text()')}`,
  ],
  TokenAxios: [
    "import axios from 'axios';",
    (tok) =>
      `const res = await axios.get(UPSTREAM, { headers: { authorization: ${tok} } });\n${text('String(res.data)')}`,
  ],
  TokenClientTransport: [
    "import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';",
    (tok) =>
      `const upstream = new StreamableHTTPClientTransport(new URL(UPSTREAM), {\n  requestInit: { headers: { Authorization: \`Bearer \${${tok}}\` } },\n});\nawait upstream.start();\n${done}`,
  ],
  ServiceToken: [
    '',
    () =>
      `const res = await fetch(UPSTREAM, { headers: { Authorization: \`Bearer \${process.env.SERVICE_TOKEN}\` } });\n${text('await res.text()')}`,
  ],
  ExchangedToken: [
    "import { exchangeForUpstreamToken } from './token-exchange';",
    (tok, ai) =>
      `const token = await exchangeForUpstreamToken(${ai});\nconst res = await fetch(UPSTREAM, { headers: { Authorization: \`Bearer \${token}\` } });\n${text('await res.text()')}`,
  ],
  TokenLogged: ['', (tok) => `console.log('caller token', ${tok});\n${done}`],
};

/** Registration tag -> (gate, body) => registration code. */
function registration(gate, reg, body) {
  const G = GATES[gate];
  const shape = G.v2 ? 'z.object({ q: z.string() })' : '{ q: z.string() }';
  const h = (params, tok, ai) =>
    `async (${params}) => {\n${indent(body(tok, ai), 2)}\n}`;
  switch (reg) {
    case 'Register':
      return `server.registerTool('debug', { description: 'Debug', inputSchema: ${shape} }, ${h('{ q }, extra', 'extra.authInfo?.token', 'extra.authInfo')});`;
    case 'Destructured':
      return `server.registerTool('debug', { description: 'Debug', inputSchema: ${shape} }, ${h('{ q }, { authInfo }', 'authInfo?.token', 'authInfo')});`;
    case 'NoSchema':
      return `server.registerTool('debug', { description: 'Debug' }, ${h('extra', 'extra.authInfo?.token', 'extra.authInfo')});`;
    case 'LegacyNoSchema':
      return `server.tool('debug', ${h('extra', 'extra.authInfo?.token', 'extra.authInfo')});`;
    case 'LowLevel':
      return `server.setRequestHandler(${G.low.method}, ${h('request: any, extra: any', 'extra.authInfo?.token', 'extra.authInfo')});`;
    case 'ArgNamedAuthInfo': {
      const s = G.v2
        ? 'z.object({ q: z.string(), authInfo: z.object({ token: z.string() }) })'
        : '{ q: z.string(), authInfo: z.object({ token: z.string() }) }';
      return `server.registerTool('debug', { description: 'Debug', inputSchema: ${s} }, ${h('{ q, authInfo }', 'authInfo?.token', 'authInfo')});`;
    }
    default:
      throw new Error(reg);
  }
}

const FILES = {
  Prod: 'src/server.ts',
  TestName: 'src/server.test.ts',
  SpecName: 'src/server.spec.ts',
  TestDir: 'test/server.ts',
  Fixtures: 'fixtures/server.ts',
  E2e: 'e2e/server.ts',
};

module.exports = {
  rule: 'no-credential-leak-in-tool',
  // Wiring: 7 gates x 6 registrations - 2 invalid = 40, x 4 shapes = 160.
  // Shapes: 26. Tests: 6 contexts x 4 shapes = 24.
  domain: 210,
  traces: 2400,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.shape)}|${tag(s.ctx)}`,
  filename: (s) => FILES[tag(s.ctx)],
  code: (s) => {
    const gate = tag(s.gate);
    const reg = tag(s.reg);
    const G = GATES[gate];
    const [imports, body] = SHAPES[tag(s.shape)];
    const low = reg === 'LowLevel';
    const r = registration(gate, reg, body);
    const serverPart = G.wrap
      ? `export const handler = createMcpHandler((server: any) => {\n${indent(r, 2)}\n});`
      : `${low ? G.low.decl : G.decl}\n${r}`;
    return (
      [
        low ? G.low.head : G.head,
        G.zod,
        imports,
        "const UPSTREAM = 'https://upstream.example.com/mcp';\nconst LOG_KEY = 'LOG_LEVEL';",
        serverPart,
      ]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  },
};
