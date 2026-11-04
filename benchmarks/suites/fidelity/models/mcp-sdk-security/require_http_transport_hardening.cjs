const { tag } = require('../../lib.cjs');
const { SDK, indent } = require('../../mcp-sdk.cjs');

const STREAMABLE = `import { StreamableHTTPServerTransport } from '${SDK}/server/streamableHttp.js';`;

/** Class tag -> [head, (opts) => construction]. `opts` is '' for none. */
const CLASSES = {
  Streamable: [STREAMABLE, (o) => `new StreamableHTTPServerTransport(${o})`],
  StreamableRequire: [
    `const { StreamableHTTPServerTransport: HttpTransport } = require('${SDK}/server/streamableHttp.js');`,
    (o) => `new HttpTransport(${o})`,
  ],
  Sse: [
    `import { SSEServerTransport } from '${SDK}/server/sse.js';`,
    (o) => `new SSEServerTransport('/messages', res${o ? `, ${o}` : ''})`,
  ],
  LegacySse: [
    "import { SSEServerTransport } from '@modelcontextprotocol/server-legacy';",
    (o) => `new SSEServerTransport('/messages', res${o ? `, ${o}` : ''})`,
  ],
  LocalClass: [
    `import { McpServer } from '${SDK}/server/mcp.js';\nexport const server = new McpServer({ name: 'demo', version: '1.0.0' });\nclass StreamableHTTPServerTransport {\n  constructor(readonly options?: object) {}\n  handleRequest(...a: unknown[]) {}\n}`,
    (o) => `new StreamableHTTPServerTransport(${o})`,
  ],
  NoMcp: [
    "import { StreamableHTTPServerTransport } from './transport';",
    (o) => `new StreamableHTTPServerTransport(${o})`,
  ],
};

const HOSTS = "['127.0.0.1:3000', 'localhost:3000']";
/** Options tag -> [module-level pre, options text]. */
const OPTS = {
  NoOptions: ['', ''],
  SessionOnly: ['', '{ sessionIdGenerator: () => randomUUID() }'],
  ExplicitFalse: [
    '',
    '{ sessionIdGenerator: () => randomUUID(), enableDnsRebindingProtection: false }',
  ],
  ExplicitFalseWithHosts: [
    '',
    `{ enableDnsRebindingProtection: false, allowedHosts: ${HOSTS} }`,
  ],
  OnNoHosts: [
    '',
    '{ sessionIdGenerator: () => randomUUID(), enableDnsRebindingProtection: true }',
  ],
  OnHosts: [
    '',
    `{ sessionIdGenerator: () => randomUUID(), enableDnsRebindingProtection: true, allowedHosts: ${HOSTS} }`,
  ],
  OnEmptyHosts: [
    '',
    '{ enableDnsRebindingProtection: true, allowedHosts: [] }',
  ],
  OnConstHosts: [
    `const ALLOWED_HOSTS = ${HOSTS};`,
    '{ enableDnsRebindingProtection: true, allowedHosts: ALLOWED_HOSTS }',
  ],
  OriginsOnly: [
    '',
    "{ enableDnsRebindingProtection: true, allowedOrigins: ['http://localhost:3000'] }",
  ],
  ConstProtected: [
    `const transportOptions = { enableDnsRebindingProtection: true, allowedHosts: ${HOSTS} };`,
    'transportOptions',
  ],
  ConstUnprotected: [
    'const transportOptions = { sessionIdGenerator: () => randomUUID() };',
    'transportOptions',
  ],
  RuntimeFlag: [
    '',
    `{ enableDnsRebindingProtection: process.env.MCP_REBINDING === '1', allowedHosts: ${HOSTS} }`,
  ],
  Spread: [
    "import { hardening } from './hardening';",
    '{ ...hardening, sessionIdGenerator: () => randomUUID() }',
  ],
  CastProtected: [
    '',
    `{ enableDnsRebindingProtection: true, allowedHosts: ${HOSTS} } as Record<string, unknown>`,
  ],
  CastUnprotected: [
    '',
    '{ sessionIdGenerator: () => randomUUID() } as Record<string, unknown>',
  ],
};

const BASE = "import { randomUUID } from 'node:crypto';";
const HHV = `import { hostHeaderValidation, localhostHostValidation } from '${SDK}/server/middleware/hostHeaderValidation.js';`;
const CREATE_APP = `import { createMcpExpressApp } from '${SDK}/server/express.js';`;

const serveRoute = (make) =>
  `app.post('/mcp', async (req, res) => {\n  const transport = ${make};\n  await transport.handleRequest(req, res, req.body);\n});`;
const checkedRoute = (make) =>
  "app.post('/mcp', async (req, res) => {\n  if (req.headers.authorization !== `Bearer ${process.env.MCP_TOKEN}`) {\n    res.status(401).end();\n    return;\n  }\n" +
  `  const transport = ${make};\n  await transport.handleRequest(req, res, req.body);\n});`;

function options(s) {
  const [head, ctor] = CLASSES[tag(s.cls)];
  const [pre, o] = OPTS[tag(s.opts)];
  return [head, pre, ctor(o)];
}

function optionsPart(s) {
  const [head, pre, make] = options(s);
  return [
    BASE,
    head,
    pre,
    `export function handle(req: any, res: any) {\n  const transport = ${make};\n  return transport.handleRequest(req, res, req.body);\n}`,
  ];
}

function appValidationPart(s) {
  const [head, pre, make] = options(s);
  const v = tag(s.validation);
  const app = {
    NoValidation: [
      "import express from 'express';",
      'const app = express();\napp.use(express.json());',
    ],
    HostHeaderValidation: [
      `import express from 'express';\n${HHV}`,
      "const app = express();\napp.use(hostHeaderValidation(['localhost', '127.0.0.1']));",
    ],
    LocalhostValidation: [
      `import express from 'express';\n${HHV}`,
      'const app = express();\napp.use(localhostHostValidation());',
    ],
    CreateAppDefault: [CREATE_APP, 'const app = createMcpExpressApp();'],
    CreateAppLoopback: [
      CREATE_APP,
      "const app = createMcpExpressApp({ host: 'localhost' });",
    ],
    CreateAppAllWithHosts: [
      CREATE_APP,
      "const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['mcp.example.com'] });",
    ],
    CreateAppAllWithHostsListen: [
      CREATE_APP,
      "const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['mcp.example.com'] });",
    ],
    CreateAppAllNoHosts: [
      CREATE_APP,
      "const app = createMcpExpressApp({ host: '0.0.0.0' });",
    ],
    CreateAppIpv6NoHosts: [
      CREATE_APP,
      "const app = createMcpExpressApp({ host: '::' });",
    ],
    InlineCredentialCheck: [
      "import express from 'express';",
      'const app = express();\napp.use(express.json());',
    ],
  }[v];
  const route =
    v === 'InlineCredentialCheck' ? checkedRoute(make) : serveRoute(make);
  const listen = v === 'CreateAppAllWithHostsListen' ? 'app.listen(3000);' : '';
  return [BASE, head, app[0], pre, app[1], route, listen];
}

function authPart(s) {
  const [head, pre, make] = options(s);
  const a = tag(s.auth);
  const b = tag(s.bind);
  const imports = [
    "import express from 'express';",
    "import http from 'node:http';",
  ];
  const setup = [];
  let route = serveRoute(make);
  switch (a) {
    case 'NoAuth':
      break;
    case 'BearerAuth':
      imports.push(
        `import { requireBearerAuth } from '${SDK}/server/auth/middleware/bearerAuth.js';`,
        "import { verifier } from './auth';",
      );
      route = route.replace(
        "app.post('/mcp', ",
        "app.post('/mcp', requireBearerAuth({ verifier }), ",
      );
      break;
    case 'UseMiddleware':
      imports.push("import { checkApiKey } from './auth';");
      setup.push('app.use(checkApiKey);');
      break;
    case 'UseFactoryOnly':
      setup.push('app.use(express.json());');
      break;
    case 'RouteMiddleware':
      imports.push("import { checkApiKey } from './auth';");
      route = route.replace(
        "app.post('/mcp', ",
        "app.post('/mcp', checkApiKey, ",
      );
      break;
    case 'InlineHeaderCheck':
      route = checkedRoute(make);
      break;
    case 'MountImported':
      imports.push("import { mountAuth } from './auth';");
      setup.push('mountAuth(app);');
      break;
    case 'MountSameFileUse':
      imports.push("import { checkApiKey } from './auth';");
      setup.push(
        'function mountAuth(target: express.Express) {\n  target.use(checkApiKey);\n}\nmountAuth(app);',
      );
      break;
    case 'MountSameFileNoUse':
      setup.push(
        "function mountHealth(target: express.Express) {\n  target.get('/health', (req, res) => res.send('ok'));\n}\nmountHealth(app);",
      );
      break;
    default:
      throw new Error(a);
  }
  const listen = {
    ListenAllV4: "app.listen(3000, '0.0.0.0');",
    ListenAllV6: "app.listen(3000, '::');",
    ListenObjHost:
      "http.createServer(app).listen({ port: 3000, host: '0.0.0.0' });",
    ListenPortOnly: 'app.listen(3000);',
    HttpServerPortOnly: 'http.createServer(app).listen(3000);',
    ListenLoopback: "app.listen(3000, '127.0.0.1');",
    ListenHostVar: 'app.listen(3000, process.env.HOST as string);',
    NoListen: 'export default app;',
  }[b];
  return [
    BASE,
    head,
    ...imports,
    pre,
    'const app = express();',
    ...setup,
    route,
    listen,
  ];
}

function v2Part(s) {
  const k = tag(s.appKind);
  const w = tag(s.v2Validator);
  const v2Hhv =
    "import { hostHeaderValidation, localhostHostValidation } from '@modelcontextprotocol/express';";
  if (k === 'HonoApp') {
    const mw = {
      V2None: '',
      V2HostHeader: "app.use(hostHeaderValidation(['localhost']));",
      V2Localhost: 'app.use(localhostHostValidation());',
      V2InlineCheck: '',
    }[w];
    const guard =
      w === 'V2InlineCheck'
        ? "  if (c.req.header('authorization') !== `Bearer ${process.env.MCP_TOKEN}`) return c.text('unauthorized', 401);\n"
        : '';
    return [
      "import { Hono } from 'hono';",
      "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';",
      "import { hostHeaderValidation, localhostHostValidation } from '@modelcontextprotocol/hono';",
      'const app = new Hono();',
      mw,
      `app.post('/mcp', async (c) => {\n${guard}  const transport = new WebStandardStreamableHTTPServerTransport();\n  return transport.handleRequest(c.req.raw);\n});`,
      'export default app;',
    ];
  }
  const mw = {
    V2None: '',
    V2HostHeader: "app.use(hostHeaderValidation(['localhost']));",
    V2Localhost: 'app.use(localhostHostValidation());',
    V2InlineCheck: '',
  }[w];
  const guard =
    w === 'V2InlineCheck'
      ? "  if (req.get('x-api-key') !== process.env.MCP_KEY) {\n    res.status(401).end();\n    return;\n  }\n"
      : '';
  const route = `app.post('/mcp', async (req, res) => {\n${guard}  const transport = new NodeStreamableHTTPServerTransport();\n  await transport.handleRequest(req, res, req.body);\n});`;
  const head = [
    "import express from 'express';",
    "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';",
    v2Hhv,
  ];
  if (k === 'ExpressParam')
    return [
      ...head,
      `export function routes(app: express.Express) {\n${indent([mw, route].filter(Boolean).join('\n'), 2)}\n}`,
    ];
  return [...head, 'const app = express();', mw, route, 'export default app;'];
}

function filesPart(s) {
  const [head, pre, make] = options(s);
  return [
    BASE,
    head,
    pre,
    `export function handle(req: any, res: any) {\n  const transport = ${make};\n  return transport.handleRequest(req, res, req.body);\n}`,
  ];
}

const FILES = {
  Prod: 'src/server.ts',
  TestName: 'src/server.test.ts',
  SpecName: 'src/server.spec.ts',
  TestsDir: 'tests/helpers/server.ts',
  E2eDir: 'e2e/server.ts',
};

const PARTS = {
  Options: optionsPart,
  AppValidation: appValidationPart,
  Auth: authPart,
  V2Apps: v2Part,
  Files: filesPart,
};

module.exports = {
  rule: 'require-http-transport-hardening',
  // Options: 6 classes x 15 options = 90. AppValidation: 2 x 10 = 20.
  // Auth: 8 binds x 9 auth kinds = 72. V2Apps: 3 x 4 = 12. Files: 2 x 5 = 10.
  domain: 204,
  traces: 2600,
  key: (s) =>
    [
      s.part,
      s.cls,
      s.opts,
      s.validation,
      s.bind,
      s.auth,
      s.appKind,
      s.v2Validator,
      s.ctx,
    ]
      .map(tag)
      .join('|'),
  filename: (s) => FILES[tag(s.ctx)],
  code: (s) => PARTS[tag(s.part)](s).filter(Boolean).join('\n') + '\n',
};
