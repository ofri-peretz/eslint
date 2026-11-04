const { tag, num } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const ALG = "algorithms: ['HS256']";
// [method, preamble, options ('' = none)]
const OPTS = {
  SignNoTsTrue: ['sign', '', '{ noTimestamp: true }'],
  SignNoTsFalse: ['sign', '', '{ noTimestamp: false }'],
  SignNoOpts: ['sign', '', ''],
  SignNoTsRuntime: ['sign', '', "{ noTimestamp: process.env.LEGACY === '1' }"],
  SignConstNoTs: ['sign', 'const opts = { noTimestamp: true };', 'opts'],
  SignSpreadConstNoTs: [
    'sign',
    'const base = { noTimestamp: true };',
    "{ ...base, expiresIn: '1h' }",
  ],
  SignCastNoTs: ['sign', '', '{ noTimestamp: true } as SignOptions'],
  VerifyIgnoreExpTrue: ['verify', '', `{ ${ALG}, ignoreExpiration: true }`],
  VerifyIgnoreExpFalse: ['verify', '', `{ ${ALG}, ignoreExpiration: false }`],
  VerifyTol30: ['verify', '', `{ ${ALG}, clockTolerance: 30 }`],
  VerifyTol300: ['verify', '', `{ ${ALG}, clockTolerance: 300 }`],
  VerifyTolYear: [
    'verify',
    '',
    `{ ${ALG}, clockTolerance: 60 * 60 * 24 * 365 }`,
  ],
  VerifyTolConst600: [
    'verify',
    'const CLOCK_SKEW = 600;',
    `{ ${ALG}, clockTolerance: CLOCK_SKEW }`,
  ],
  VerifyTolString: ['verify', '', `{ ${ALG}, clockTolerance: '5 minutes' }`],
  VerifyTolRuntime: [
    'verify',
    '',
    `{ ${ALG}, clockTolerance: Number(process.env.SKEW) }`,
  ],
};

module.exports = {
  rule: 'no-timestamp-manipulation',
  domain: 256, // 8 spellings x 16 option shapes x 2 maxClockToleranceSeconds
  traces: 2000,
  key: (s) => `${tag(s.spelling)}|${tag(s.opts)}|max=${num(s.maxTol)}`,
  config: (s) =>
    num(s.maxTol) === 300 ? {} : { maxClockToleranceSeconds: num(s.maxTol) },
  code: (s) => {
    const o = tag(s.opts);
    const [imp, callee] = spell(
      tag(s.spelling),
      o.startsWith('Sign') ? 'sign' : 'verify',
    );
    if (o === 'PassportIgnoreExp')
      return [
        imp,
        "import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';",
        'export const strategy = new JwtStrategy(',
        '  { secretOrKey, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: true },',
        '  verify,',
        ');',
      ]
        .filter(Boolean)
        .join('\n');
    const [method, pre, opts] = OPTS[o];
    const first = method === 'sign' ? 'payload' : 'token';
    const args = [first, 'secret', opts].filter(Boolean).join(', ');
    return [imp, pre, `export const r = ${callee}(${args});`]
      .filter(Boolean)
      .join('\n');
  },
};
