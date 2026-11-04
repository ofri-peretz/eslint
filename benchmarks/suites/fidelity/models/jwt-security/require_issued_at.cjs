const { tag } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const NOW = 'Math.floor(Date.now() / 1000)';
const FLAG = "process.env.LEGACY === '1'";
// [preamble, payload, options ('' = none)]
const SHAPES = {
  NoOptions: ['', 'payload', ''],
  NoTimestampFalse: ['', 'payload', '{ noTimestamp: false }'],
  NoTimestampTrue: ['', 'payload', '{ noTimestamp: true }'],
  ExpiresInOnly: ['', 'payload', "{ expiresIn: '1h' }"],
  NoTimestampRuntime: ['', 'payload', `{ noTimestamp: ${FLAG} }`],
  RuntimeInConst: [
    `const signOptions = { noTimestamp: ${FLAG} };`,
    'payload',
    'signOptions',
  ],
  RuntimeInSpread: [
    `const base = { noTimestamp: ${FLAG} };`,
    'payload',
    "{ ...base, expiresIn: '1h' }",
  ],
  RuntimeInCast: ['', 'payload', `{ noTimestamp: ${FLAG} } as SignOptions`],
  RuntimeWithPayloadIat: [
    '',
    `{ sub: user.id, iat: ${NOW} }`,
    `{ noTimestamp: ${FLAG} }`,
  ],
  OptionsFromCall: ['', 'payload', 'getSignOptions()'],
};

const CHAIN = ".setProtectedHeader({ alg: 'ES256' })";
const JOSE = {
  JoseNoIat: `return await new SignJWT({ sub: user.id })${CHAIN}.setExpirationTime('1h').sign(key);`,
  JoseSetIssuedAt: `return await new SignJWT({ sub: user.id })${CHAIN}.setIssuedAt().setExpirationTime('1h').sign(key);`,
  JoseSeparateSetIssuedAt: `const builder = new SignJWT({ sub: user.id })${CHAIN};\n  builder.setIssuedAt();\n  return await builder.sign(key);`,
  JoseClaimsIat: `return await new SignJWT({ sub: user.id, iat: ${NOW} })${CHAIN}.sign(key);`,
};

const fn = (body) =>
  `export async function issue(payload: any, user: any, key: any) {\n  ${body}\n}`;

module.exports = {
  rule: 'require-issued-at',
  domain: 84, // 8 spellings x 10 shapes + jose x 4
  traces: 1500,
  key: (s) => `${tag(s.spelling)}|${tag(s.shape)}`,
  code: (s) => {
    const sp = tag(s.spelling);
    const sh = tag(s.shape);
    if (sp === 'JoseChain')
      return ["import { SignJWT } from 'jose';", fn(JOSE[sh])].join('\n');
    const [imp, c] = spell(sp, 'sign');
    const [pre, payload, opts] = SHAPES[sh];
    const args = [payload, 'key', opts].filter(Boolean).join(', ');
    return [imp, pre, fn(`return ${c}(${args});`)].filter(Boolean).join('\n');
  },
};
