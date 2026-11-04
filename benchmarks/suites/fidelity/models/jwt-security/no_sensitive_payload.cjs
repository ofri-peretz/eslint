const { tag } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const FIELDS = {
  Password: 'password: user.password',
  PasswordHash: 'passwordHash: user.passwordHash',
  Ssn: 'ssn: user.ssn',
  Email: 'email: user.email',
  CreditCardSnake: 'credit_card: user.card',
  CreditCardKebab: "'credit-card': user.card",
  ApiKey: 'apiKey: user.apiKey',
  RefreshToken: 'refreshToken: session.refreshToken',
  Sub: 'sub: user.id',
  Role: 'role: user.role',
  InternalId: 'internalId: user.internalId',
};

// field -> [preamble, payload expression]
const SHAPES = {
  Inline: (f) => ['', `{ sub: user.id, ${f} }`],
  ConstPayload: (f) => [`const payload = { sub: user.id, ${f} };`, 'payload'],
  SpreadOfConst: (f) => [
    `const base = { ${f} };`,
    '{ ...base, scope: "read" }',
  ],
  SpreadParam: () => ['', '{ ...record }'],
  SpreadQueryRow: () => [
    'const row = await prisma.user.findUnique({ where: { id } });',
    "{ ...row, role: 'user' }",
  ],
  PayloadParam: () => ['', 'record'],
};

const signer = (sp) => {
  if (sp === 'JoseSignJwt')
    return [
      "import { SignJWT } from 'jose';",
      (p) =>
        `await new SignJWT(${p}).setProtectedHeader({ alg: 'HS256' }).sign(key)`,
    ];
  const [imp, c] = spell(sp, 'sign');
  return [imp, (p) => `${c}(${p}, secret)`];
};

module.exports = {
  rule: 'no-sensitive-payload',
  domain: 648, // 9 signers x (3 field shapes x 11 fields + 3 record shapes) x 2
  traces: 6000,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.shape)}|${tag(s.claim)}|custom=${s.custom}`,
  config: (s) =>
    s.custom ? { additionalSensitiveFields: ['internalId'] } : {},
  code: (s) => {
    const [imp, sign] = signer(tag(s.spelling));
    const [pre, payload] = SHAPES[tag(s.shape)](FIELDS[tag(s.claim)]);
    return [
      imp,
      'export async function issue(record: any, user: any, session: any, id: string) {',
      pre,
      `  return ${sign(payload)};`,
      '}',
    ]
      .filter(Boolean)
      .join('\n');
  },
};
