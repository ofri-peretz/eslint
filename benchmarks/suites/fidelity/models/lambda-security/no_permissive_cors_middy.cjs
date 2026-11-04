const { tag, withTestFile } = require('../../lib.cjs');

const OPTS = {
  Star: "{ origin: '*' }",
  StarTemplate: '{ origin: `*` }',
  StarComputed: "{ ['origin']: '*' }",
  StarArray: "{ origins: ['*'] }",
  StarWithCreds: "{ origin: '*', credentials: true }",
  NoArgs: '',
  Specific: "{ origin: 'https://app.example.com' }",
  SpecificList:
    "{ origins: ['https://app.example.com', 'https://admin.example.com'] }",
  Subdomain: "{ origins: ['https://*.example.com'] }",
  FromEnv: '{ origin: process.env.CORS_ORIGIN }',
};
// Import tag -> [import line, the middleware's local name]
const IMPORT = {
  DefaultCors: ["import cors from '@middy/http-cors';", 'cors'],
  DefaultHttpCors: ["import httpCors from '@middy/http-cors';", 'httpCors'],
  Renamed: ["import corsMiddleware from '@middy/http-cors';", 'corsMiddleware'],
  Required: ["const cors = require('@middy/http-cors');", 'cors'],
  Lookalike: ["import cors from './cors';", 'cors'],
};
const MOUNT = {
  UseCall: (mw) => [`export const handler = middy(baseHandler).use(${mw});`],
  UseArray: (mw) => [
    `export const handler = middy(baseHandler).use([jsonBodyParser(), ${mw}]);`,
  ],
  Separate: (mw) => [
    'export const handler = middy(baseHandler);',
    `handler.use(${mw});`,
  ],
  HandlerChain: (mw) => [
    `export const handler = middy().use(${mw}).handler(baseHandler);`,
  ],
};

const base = {
  rule: 'no-permissive-cors-middy',
  // Origins 10; Imports 5 x 2; Mounts 4 x 2.
  domain: 10 + 10 + 8,
  traces: 600,
  key: (s) =>
    ['focus', 'origin', 'imp', 'mount']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const [imp, name] = IMPORT[tag(s.imp)];
    return [
      "import middy from '@middy/core';",
      "import jsonBodyParser from '@middy/http-json-body-parser';",
      imp,
      'const baseHandler = async (event) => ({ statusCode: 200, body: JSON.stringify({ ok: true }) });',
      ...MOUNT[tag(s.mount)](`${name}(${OPTS[tag(s.origin)]})`),
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
