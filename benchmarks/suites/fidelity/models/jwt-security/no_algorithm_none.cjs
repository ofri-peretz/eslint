const { tag, withTestFile } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

// [method, preamble, options argument ('' = none)]
const OPTS = {
  VerifyAlgNone: ['verify', '', "{ algorithm: 'none' }"],
  VerifyAlgNoneUpper: ['verify', '', "{ algorithm: 'NONE' }"],
  VerifyAlgNoneTitle: ['verify', '', "{ algorithm: 'None' }"],
  VerifyAlgRs: ['verify', '', "{ algorithm: 'RS256' }"],
  VerifyAlgsNone: ['verify', '', "{ algorithms: ['none'] }"],
  VerifyAlgsMixed: ['verify', '', "{ algorithms: ['RS256', 'none'] }"],
  VerifyAlgsEmpty: ['verify', '', '{ algorithms: [] }'],
  VerifyAlgsSafe: ['verify', '', "{ algorithms: ['RS256', 'ES256'] }"],
  VerifyNoOpts: ['verify', '', ''],
  VerifyConstNone: ['verify', "const opts = { algorithms: ['none'] };", 'opts'],
  VerifySpreadConstNone: [
    'verify',
    "const bad = { algorithms: ['none'] };",
    '{ ...bad }',
  ],
  VerifySpreadCall: ['verify', '', '{ ...loadOptions() }'],
  SignAlgNone: ['sign', '', "{ algorithm: 'none' }"],
  SignAlgHs: ['sign', '', "{ algorithm: 'HS256' }"],
  SignConstNone: ['sign', "const opts = { algorithm: 'none' };", 'opts'],
};

const base = {
  rule: 'no-algorithm-none',
  domain: 120, // 8 spellings x 15 option shapes
  traces: 700,
  key: (s) => `${tag(s.spelling)}|${tag(s.opts)}`,
  code: (s) => {
    const [method, pre, opts] = OPTS[tag(s.opts)];
    const [imp, callee] = spell(tag(s.spelling), method);
    const first = method === 'sign' ? 'payload' : 'token';
    const args = [first, 'secret', opts].filter(Boolean).join(', ');
    return [imp, pre, `export const r = ${callee}(${args});`]
      .filter(Boolean)
      .join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
