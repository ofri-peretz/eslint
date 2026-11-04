const { tag } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const PATH = {
  Debug: '/debug',
  DunderDebug: '/__debug__',
  Admin: '/admin',
  UnderAdmin: '/_admin',
  Test: '/test',
  Health: '/health',
  DebugSub: '/debug/vars',
  AdminSub: '/admin/users',
  Latest: '/latest',
  Testimonials: '/testimonials',
  Profile: '/api/profile',
  Custom: '/internal-monitor',
};
const DUMP = [
  'return { statusCode: 200, body: JSON.stringify(process.memoryUsage()) };',
];
const branch = (cond) => [`if (${cond}) {`, `  ${DUMP[0]}`, '}'];
// Handler-body accesses: the lines that route on path `p`.
const ROUTE = {
  PathEq: (p) => branch(`event.path === '${p}'`),
  RawPath: (p) => branch(`event.rawPath === '${p}'`),
  Resource: (p) => branch(`event.resource === '${p}'`),
  RouteKey: (p) => branch(`event.routeKey === 'GET ${p}'`),
  HttpPath: (p) => branch(`event.requestContext.http.path === '${p}'`),
  Bracket: (p) => branch(`event['rawPath'] === '${p}'`),
  Destructured: (p) => [
    'const { rawPath } = event;',
    ...branch(`rawPath === '${p}'`),
  ],
  Reversed: (p) => branch(`'${p}' === event.path`),
  SwitchCase: (p) => [
    'switch (event.rawPath) {',
    `  case '${p}':`,
    `    ${DUMP[0]}`,
    '  default:',
    '    break;',
    '}',
  ],
};
const sls = (key, p) => [
  'export const serverless = {',
  '  functions: {',
  `    ops: { handler: 'handler.ops', events: [{ ${key}: { path: '${p}', method: 'get' } }] },`,
  '  },',
  '};',
];
const SLS = {
  SlsHttp: (p) => sls('http', p),
  SlsHttpApi: (p) => sls('httpApi', p),
  SlsNoSlash: (p) => sls('http', p.slice(1)),
};

module.exports = {
  rule: 'no-exposed-debug-endpoints',
  // Paths 12 x 2 lists; Accesses 13 x 3 paths; Gates 9 x 2 paths; Files 3.
  domain: 24 + 39 + 18 + 3,
  traces: 1500,
  key: (s) =>
    ['focus', 'path', 'access', 'custom', 'gate', 'file']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (s.custom) o.endpoints = ['/internal-monitor'];
    if (tag(s.file) === 'IgnoredWithOpt') o.ignoreFiles = ['health-check.ts'];
    return Object.keys(o).length ? o : undefined;
  },
  filename: (s) =>
    tag(s.file) === 'PlainFile' ? 'src/app.ts' : 'src/handlers/health-check.ts',
  code: (s) => {
    const p = PATH[tag(s.path)];
    const a = tag(s.access);
    if (a === 'SlsTs') {
      // The canonical serverless.ts: its only evidence is the framework types.
      return [
        "import type { AWS } from '@serverless/typescript';",
        'const serverlessConfiguration: AWS = {',
        "  service: 'orders',",
        "  provider: { name: 'aws', runtime: 'nodejs20.x' },",
        '  functions: {',
        `    ops: { handler: 'src/ops.handler', events: [{ http: { path: '${p}', method: 'get' } }] },`,
        '  },',
        '};',
        'module.exports = serverlessConfiguration;',
        '',
      ].join('\n');
    }
    if (SLS[a]) {
      return lambdaProgram(
        tag(s.gate),
        ["return { statusCode: 200, body: 'ok' };"],
        {
          pre: SLS[a](p),
        },
      );
    }
    return lambdaProgram(tag(s.gate), [
      ...ROUTE[a](p),
      "return { statusCode: 404, body: 'not found' };",
    ]);
  },
};
