const { tag, num } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const SECRETS = {
  KnownWeak: "'changeme'",
  Short8: "'shortkey'",
  Medium20: "'k9Fq2Lx7Wm4Rt8Zp3Vb6'",
  Long34: "'ThisIsAVeryStrongSecretThatIs34Ch'",
};
// literal -> [preamble, key expression]
const FORMS = {
  Inline: (v) => ['', v],
  ConstBinding: (v) => [`const JWT_SECRET = ${v};`, 'JWT_SECRET'],
  EnvFallback: (v) => ['', `process.env.JWT_SECRET || ${v}`],
  LetNeverReassigned: (v) => [`let jwtSecret = ${v};`, 'jwtSecret'],
};

const SINKS = {
  Jsonwebtoken: (sp, k) => {
    const [imp, c] = spell(sp, 'sign');
    return [imp, `export const t = ${c}(payload, ${k});`];
  },
  ExpressJwt: (_, k) => [
    "import { expressjwt } from 'express-jwt';",
    `export const auth = expressjwt({ secret: ${k}, algorithms: ['HS256'] });`,
  ],
  JoseSignJwt: (_, k) => [
    "import { SignJWT } from 'jose';",
    `export const t = await new SignJWT(claims)\n  .setProtectedHeader({ alg: 'HS256' })\n  .sign(new TextEncoder().encode(${k}));`,
  ],
  // A JWT import is present, the call is node:crypto's Sign object.
  CryptoSignTwin: () => [
    "import jwt from 'jsonwebtoken';\nimport { createSign } from 'node:crypto';",
    "const signer = createSign('SHA256');\nsigner.update(data);\nexport const sig = signer.sign(privateKey, 'base64');",
  ],
};

module.exports = {
  rule: 'no-weak-secret',
  // (8 spellings + 3 other sinks) x 4 secrets x 4 forms x 2 minSecretLength x 2 files
  domain: 704,
  traces: 9000,
  key: (s) =>
    `${tag(s.sink)}|${tag(s.spelling)}|${tag(s.secret)}|${tag(s.form)}|min=${num(s.minLen)}|test=${s.testFile}`,
  config: (s) =>
    num(s.minLen) === 32 ? {} : { minSecretLength: num(s.minLen) },
  filename: (s) => (s.testFile ? 'src/auth.spec.ts' : 'src/auth.ts'),
  code: (s) => {
    const [pre, k] = FORMS[tag(s.form)](SECRETS[tag(s.secret)]);
    const [imp, body] = SINKS[tag(s.sink)](tag(s.spelling), k);
    return [imp, pre, body].filter(Boolean).join('\n');
  },
};
