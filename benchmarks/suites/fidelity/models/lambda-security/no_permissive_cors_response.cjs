const { tag, withTestFile } = require('../../lib.cjs');
const { lambdaProgram } = require('../../lambda.cjs');

const VALUE = {
  Star: "'*'",
  StarTemplate: '`*`',
  Specific: "'https://app.example.com'",
  FromEnv: 'process.env.CORS_ORIGIN',
  Validated: 'allowedOrigin',
};
const headers = (k, v) => {
  switch (k) {
    case 'Lower':
      return `headers: { 'access-control-allow-origin': ${v}, 'content-type': 'application/json' }`;
    case 'Computed':
      return `headers: { ['Access-Control-Allow-Origin']: ${v} }`;
    case 'MultiValue':
      return `multiValueHeaders: { 'Access-Control-Allow-Origin': [${v}] }`;
    default:
      return `headers: { 'Access-Control-Allow-Origin': ${v}, 'Content-Type': 'application/json' }`;
  }
};
const response = (h) =>
  `{ statusCode: 200, ${h}, body: JSON.stringify({ data: 'sensitive' }) }`;
// Loc -> [module-level lines, handler body lines]
const LOC = {
  Return: (h) => [[], [`return ${response(h)};`]],
  ArrowImplicit: (h) => [
    [
      `const jsonResponse = (data: unknown) => (${response(h).replace("JSON.stringify({ data: 'sensitive' })", 'JSON.stringify(data)')});`,
    ],
    ['return jsonResponse({ ok: true });'],
  ],
  ResponseVar: (h) => [[], [`const res = ${response(h)};`, 'return res;']],
  Callback: (h) => [[], [`callback(null, ${response(h)});`]],
  Factory: (h) => [
    [
      `function createResponse(body: unknown) {\n  return ${response(h).replace("JSON.stringify({ data: 'sensitive' })", 'JSON.stringify(body)')};\n}`,
    ],
    ['return createResponse({ ok: true });'],
  ],
  FetchOptions: (h) => [
    [],
    [
      `await fetch('https://api.example.com/data', { method: 'GET', ${h} });`,
      'return { statusCode: 204 };',
    ],
  ],
};

const base = {
  rule: 'no-permissive-cors-response',
  // Values 5; Keys 4 x 2; Locs 6 x 2; Gates 9 x 2.
  domain: 5 + 8 + 12 + 18,
  traces: 1000,
  key: (s) =>
    ['focus', 'value', 'key', 'loc', 'gate']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const gate = tag(s.gate);
    const loc = tag(s.loc);
    const handlerGate = !gate.startsWith('Sdk') && gate !== 'NoEvidence';
    const [pre, body] = LOC[loc](headers(tag(s.key), VALUE[tag(s.value)]));
    return lambdaProgram(
      gate,
      [
        'const origin = event.headers?.origin;',
        'const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];',
        ...body,
      ],
      {
        pre: [
          "const ALLOWED_ORIGINS = ['https://app.example.com', 'https://admin.example.com'];",
          ...(loc === 'Callback' && !handlerGate
            ? ['declare const callback: (e: unknown, r?: unknown) => void;']
            : []),
          ...pre,
        ],
        params:
          loc === 'Callback' && handlerGate
            ? 'event, context, callback'
            : 'event, context',
      },
    );
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
