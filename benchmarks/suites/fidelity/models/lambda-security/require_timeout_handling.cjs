const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

// Param -> [event name, context name or null, options]
const PARAM = {
  EventContext: ['event', 'context'],
  EventCtx: ['event', 'ctx'],
  EventOnly: ['event', null],
  CustomCtxOpt: ['event', 'lambdaCtx', { contextParamNames: ['lambdaCtx'] }],
  CustomCtxNoOpt: ['event', 'lambdaCtx'],
  PayloadOpt: ['payload', 'context', { eventParamNames: ['payload'] }],
  PayloadNoOpt: ['payload', 'context'],
};
// Call -> the external (or local) work, given the fetch options text.
const CALL = {
  Fetch: (o) => `const res = await fetch('https://api.example.com/data'${o});`,
  AxiosGet: (o) =>
    `const res = await axios.get('https://api.example.com/data'${o});`,
  SdkSend: (o) =>
    `const res = await ddb.send(new GetItemCommand({ TableName: 'orders', Key: { pk: { S: '1' } } })${o.replace('signal', 'abortSignal')});`,
  DbQuery: () => "const res = await pool.query('SELECT * FROM orders');",
  Compute: () => 'const res = [3, 1, 2].sort();',
  MapGet: () => "const res = cache.get('orders');",
};
// Guard -> [lines before the call, the call's options argument]
const GUARD = {
  NoGuard: () => [[], ''],
  RemainingCheck: (ctx) => [
    [
      `if (${ctx}.getRemainingTimeInMillis() < 5000) {`,
      "  return { statusCode: 503, body: 'Insufficient time' };",
      '}',
    ],
    '',
  ],
  BracketRemaining: (ctx) => [
    [
      `const remaining = ${ctx}['getRemainingTimeInMillis']();`,
      "if (remaining < 5000) return { statusCode: 503, body: 'Insufficient time' };",
    ],
    '',
  ],
  AbortCtl: () => [
    [
      'const controller = new AbortController();',
      'setTimeout(() => controller.abort(), 3000);',
    ],
    ', { signal: controller.signal }',
  ],
  AbortSignalTimeout: () => [[], ', { signal: AbortSignal.timeout(3000) }'],
  PromiseRace: () => [[], ''],
};

const base = {
  rule: 'require-timeout-handling',
  // Calls 6; Guards 6; Params 7; Gates 6.
  domain: 6 + 6 + 7 + 6,
  traces: 600,
  key: (s) =>
    ['focus', 'call', 'guard', 'param', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => PARAM[tag(s.param)][2],
  code: (s) => {
    const [ev, ctx] = PARAM[tag(s.param)];
    const guard = tag(s.guard);
    const [pre, opts] = GUARD[guard](ctx);
    let call = CALL[tag(s.call)](opts);
    if (guard === 'PromiseRace') {
      call = call.replace(
        /await (.*);$/,
        "await Promise.race([$1, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))]);",
      );
    }
    return lambdaProgram(
      tag(s.gate),
      [
        ...pre,
        call,
        `return { statusCode: 200, body: JSON.stringify(${ev} && res) };`,
      ],
      {
        imports: [
          "import axios from 'axios';",
          "import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';",
          "import { pool } from './db';",
        ],
        pre: [
          'const ddb = new DynamoDBClient({});',
          'const cache = new Map();',
        ],
        params: ctx ? `${ev}: any, ${ctx}: any` : `${ev}: any`,
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
