const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

// [property, value] the catch block puts in the response body.
const LEAK = {
  Stack: ['stack', 'error.stack'],
  StackTrace: ['stackTrace', 'error.stackTrace'],
  StackBracket: ['stack', "error['stack']"],
  Dirname: ['path', '__dirname'],
  Filename: ['file', '__filename'],
  Config: ['config', 'error.config'],
  ErrEnv: ['env', 'error.env'],
  Cause: ['cause', 'error.cause'],
  WholeError: null,
  Message: ['message', 'error.message'],
  Generic: ['error', "'Internal server error'"],
  RequestId: ['requestId', 'event.requestId'],
  OtherStack: ['stack', 'deployment.stack'],
  DomainObject: 'order',
};
// A whole object serialized: the caught error, or `order` (a domain object).
const payload = (l) => {
  const kv = LEAK[l];
  if (typeof kv === 'string') return `JSON.stringify(${kv})`;
  return kv
    ? `JSON.stringify({ ${kv[0]}: ${kv[1]} })`
    : 'JSON.stringify(error)';
};
const raw = (l) => (Array.isArray(LEAK[l]) ? LEAK[l][1] : payload(l));
const LOC = {
  BodyStringify: (l) => [`return { statusCode: 500, body: ${payload(l)} };`],
  BodyDirect: (l) => [`return { statusCode: 500, body: ${raw(l)} };`],
  ConsoleLog: (l) => [
    `console.error('Request failed', ${payload(l)});`,
    "return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };",
  ],
  ResponseVar: (l) => [
    `const response = { statusCode: 500, body: ${payload(l)} };`,
    'return response;',
  ],
  Callback: (l) => [
    `return callback(null, { statusCode: 500, body: ${payload(l)} });`,
  ],
};

const base = {
  rule: 'no-exposed-error-details',
  // Leaks 14; Locs 5 x 3 leaks; Gates 9 x 2 leaks.
  domain: 14 + 15 + 18,
  traces: 900,
  key: (s) =>
    ['focus', 'leak', 'loc', 'gate'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const gate = tag(s.gate);
    const loc = tag(s.loc);
    const handlerGate = !gate.startsWith('Sdk') && gate !== 'NoEvidence';
    return lambdaProgram(
      gate,
      [
        'try {',
        '  await processRequest(event);',
        "  return { statusCode: 200, body: '{}' };",
        '} catch (error: any) {',
        ...LOC[loc](tag(s.leak)).map((l) => `  ${l}`),
        '}',
      ],
      {
        imports: [
          "import { processRequest, deployment, order } from './service';",
        ],
        params:
          handlerGate && loc === 'Callback'
            ? 'event, context, callback'
            : 'event, context',
        pre:
          !handlerGate && loc === 'Callback'
            ? ['declare const callback: (e: unknown, r?: unknown) => void;']
            : [],
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
