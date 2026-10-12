// Renders one state of models/mcp-sdk-security.require-http-transport-hardening.qnt.
// Spells the shape only; the verdict is the model's `expected`.

export const plugin = 'mcp-sdk-security';
export const rule = 'require-http-transport-hardening';
export const dimensions = ['transport', 'options', 'app', 'bind', 'auth'];

const V1 = '@modelcontextprotocol/sdk/server';

const OPTIONS = {
  NoOptions: '',
  Hardened:
    "enableDnsRebindingProtection: true, allowedHosts: ['localhost:3000']",
  RebindingNoHosts: 'enableDnsRebindingProtection: true',
};

/** `new …Transport(…)` for a transport and its options. */
function construct(t, o) {
  if (t === 'V2Node')
    return 'new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })';
  if (t === 'V1Sse')
    return o === 'Unreadable'
      ? "new SSEServerTransport('/messages', res, transportOptions)"
      : o === 'NoOptions'
        ? "new SSEServerTransport('/messages', res)"
        : `new SSEServerTransport('/messages', res, { ${OPTIONS[o]} })`;
  if (o === 'Unreadable')
    return 'new StreamableHTTPServerTransport(transportOptions)';
  const extra = OPTIONS[o] ? `, ${OPTIONS[o]}` : '';
  return `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined${extra} })`;
}

const APP = {
  RawExpress: 'const app = express();\napp.use(express.json());',
  RawExpressValidated:
    "const app = express();\napp.use(express.json());\napp.use(hostHeaderValidation(['mcp.example.com']));",
  McpAppDefault: 'const app = createMcpExpressApp();',
  McpAppAllInterfaces: "const app = createMcpExpressApp({ host: '0.0.0.0' });",
  McpAppAllowedHosts:
    "const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['mcp.example.com'] });",
};

const BIND = {
  NoListen: '',
  ListenNoHost: 'app.listen(3000);',
  ListenLoopback: "app.listen(3000, '127.0.0.1');",
  ListenAllInterfaces: "app.listen(3000, '0.0.0.0');",
};

const GATE = {
  NoAuth: '',
  BearerMiddleware: '',
  InlineHeaderGate:
    '  if (req.headers.authorization !== `Bearer ${API_KEY}`) {\n    res.status(401).end();\n    return;\n  }\n',
  InlineBodyCheck:
    '  if (!req.body) {\n    res.status(400).end();\n    return;\n  }\n',
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const v2 = c.transport === 'V2Node';
  const imports = [
    "import express from 'express';",
    v2
      ? "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\nimport { createMcpExpressApp, hostHeaderValidation } from '@modelcontextprotocol/express';"
      : `import { StreamableHTTPServerTransport } from '${V1}/streamableHttp.js';\nimport { SSEServerTransport } from '${V1}/sse.js';\nimport { createMcpExpressApp } from '${V1}/express.js';\nimport { hostHeaderValidation } from '${V1}/middleware/hostHeaderValidation.js';`,
    `import { requireBearerAuth } from '${V1}/auth/middleware/bearerAuth.js';`,
    "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';",
    'declare const transportOptions: any;',
    'declare const verifier: any;',
    "const API_KEY = 'k';",
    "const server = new McpServer({ name: 'x', version: '1.0.0' });",
  ];
  const mw =
    c.auth === 'BearerMiddleware' ? 'requireBearerAuth({ verifier }), ' : '';
  const gate = GATE[c.auth];
  const routes =
    c.transport === 'V1Sse'
      ? [
          'const transports: Record<string, any> = {};',
          `app.get('/sse', ${mw}async (req, res) => {`,
          `${gate}  const transport = ${construct(c.transport, c.options)};`,
          '  transports[transport.sessionId] = transport;',
          '  await server.connect(transport);',
          '});',
          `app.post('/messages', ${mw}async (req, res) => {`,
          `${gate}  const transport = transports[String(req.query.sessionId)];`,
          '  await transport.handlePostMessage(req, res, req.body);',
          '});',
        ]
      : [
          `app.post('/mcp', ${mw}async (req, res) => {`,
          `${gate}  const transport = ${construct(c.transport, c.options)};`,
          '  await server.connect(transport);',
          '  await transport.handleRequest(req, res, req.body);',
          '});',
        ];
  return [...imports, APP[c.app], ...routes, BIND[c.bind], '']
    .filter(Boolean)
    .join('\n');
}
