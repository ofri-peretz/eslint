const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

// Source -> [setup lines, the expression holding the URL (or host)]
const SOURCE = {
  QueryDirect: [[], 'event.queryStringParameters.url'],
  QueryDestructured: [['const { url } = event.queryStringParameters;'], 'url'],
  PathParam: [[], 'event.pathParameters.host'],
  Header: [[], "event.headers['x-callback-url']"],
  BodyParsed: [
    ["const body = JSON.parse(event.body ?? '{}');"],
    'body.webhookUrl',
  ],
  BodyDestructured: [
    ["const { webhookUrl } = JSON.parse(event.body ?? '{}');"],
    'webhookUrl',
  ],
  Constant: [[], "'https://api.trusted.com/data'"],
  EnvUrl: [[], 'process.env.UPSTREAM_URL'],
  AllowlistChecked: [
    [
      "const body = JSON.parse(event.body ?? '{}');",
      'const target = new URL(body.webhookUrl);',
      "if (!ALLOWED_HOSTS.includes(target.host)) return { statusCode: 400, body: 'Invalid webhook URL' };",
    ],
    'target.toString()',
  ],
};
const SINK = {
  Fetch: (u) => `const res = await fetch(${u});`,
  AxiosGet: (u) => `const res = await axios.get(${u});`,
  AxiosConfig: (u) =>
    `const res = await axios({ url: ${u}, method: 'POST', data: { ok: true } });`,
  Got: (u) => `const res = await got(${u});`,
  HttpsGet: (u) => `const res = https.get(${u});`,
  FetchTemplate: (u) =>
    `const res = await fetch(\`https://\${${u}}/api/status\`);`,
  AxiosPostData: (u) =>
    `const res = await axios.post('https://hooks.trusted.com/register', { callback: ${u} });`,
  NotHttp: (u) => `const res = await db.save({ callback: ${u} });`,
};

const base = {
  rule: 'no-user-controlled-requests',
  // Sources 9; Sinks 8 x 3 sources; Gates 9.
  domain: 9 + 24 + 9,
  traces: 900,
  key: (s) =>
    ['focus', 'source', 'sink', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const [setup, u] = SOURCE[tag(s.source)];
    return lambdaProgram(
      tag(s.gate),
      [
        ...setup,
        SINK[tag(s.sink)](u),
        "return { statusCode: 200, body: 'ok' };",
      ],
      {
        imports: [
          "import axios from 'axios';",
          "import got from 'got';",
          "import https from 'node:https';",
          "import { db } from './db';",
        ],
        pre: [
          "const ALLOWED_HOSTS = ['api.trusted.com', 'webhook.partner.com'];",
        ],
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
