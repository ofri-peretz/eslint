const { tag } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const PEM_PUBLIC =
  "'-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\\n-----END PUBLIC KEY-----'";

// [top-level preamble, key expression]
const KEYS = {
  Literal: ['', "'my-secret-key'"],
  Template: ['', '`static-secret`'],
  EnvOrLiteral: ['', "process.env.JWT_SECRET || 'secret'"],
  ConstEnvNullish: [
    "const SECRET = process.env.JWT_SECRET ?? 'changeme';",
    'SECRET',
  ],
  ConstLiteral: ["const SECRET = 'my-secret-key';", 'SECRET'],
  LetNeverReassigned: ["let signingKey = 'my-secret-key';", 'signingKey'],
  ObjectMember: [
    "const config = { jwt: { secret: 'my-secret-key' } };",
    'config.jwt.secret',
  ],
  FunctionReturn: [
    "function jwtKey() {\n  return 'my-secret-key';\n}",
    'jwtKey()',
  ],
  LetReassigned: [
    "let signingKey = 'dev-only-key';\nif (process.env.NODE_ENV === 'production') signingKey = process.env.JWT_SECRET;",
    'signingKey',
  ],
  EnvVar: ['', 'process.env.JWT_SECRET'],
  VaultCall: ['', 'getSecretFromVault()'],
  PemPublicKey: [`const IDP_PUBLIC_KEY = ${PEM_PUBLIC};`, 'IDP_PUBLIC_KEY'],
  ConfigMember: ['', 'config.jwtSecret'],
};

// (spelling, key expression) -> [import, body]
const SINKS = {
  JsonwebtokenSign: (sp, k) => {
    const [imp, c] = spell(sp, 'sign');
    return [imp, `export const t = ${c}(payload, ${k});`];
  },
  JsonwebtokenVerify: (sp, k) => {
    const [imp, c] = spell(sp, 'verify');
    return [imp, `export const p = ${c}(token, ${k});`];
  },
  JoseSignJwt: (_, k) => [
    "import { SignJWT } from 'jose';",
    `export const t = await new SignJWT(claims)\n  .setProtectedHeader({ alg: 'HS256' })\n  .sign(new TextEncoder().encode(${k}));`,
  ],
  NestRegister: (_, k) => [
    "import { JwtModule } from '@nestjs/jwt';",
    `export const jwtModule = JwtModule.register({ secret: ${k} });`,
  ],
  NestServiceSign: (_, k) => [
    "import { JwtService } from '@nestjs/jwt';",
    `export class AuthService {\n  constructor(private readonly jwtService: JwtService) {}\n  issue(payload: object) {\n    return this.jwtService.sign(payload, { secret: ${k} });\n  }\n}`,
  ],
  ExpressJwt: (_, k) => [
    "import { expressjwt } from 'express-jwt';",
    `export const auth = expressjwt({ secret: ${k}, algorithms: ['HS256'] });`,
  ],
  PassportStrategy: (_, k) => [
    "import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';",
    `export const strategy = new JwtStrategy(\n  { secretOrKey: ${k}, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },\n  verify,\n);`,
  ],
  FastJwtSigner: (_, k) => [
    "import { createSigner } from 'fast-jwt';",
    `export const signer = createSigner({ key: ${k} });`,
  ],
};

module.exports = {
  rule: 'no-hardcoded-secret',
  domain: 572, // (8 spellings x 2 jsonwebtoken sinks + 6 other sinks) x 13 keys x 2 files
  traces: 9000,
  key: (s) =>
    `${tag(s.sink)}|${tag(s.spelling)}|${tag(s.key)}|test=${s.testFile}`,
  filename: (s) => (s.testFile ? 'src/auth.test.ts' : 'src/auth.ts'),
  code: (s) => {
    const [pre, k] = KEYS[tag(s.key)];
    const [imp, body] = SINKS[tag(s.sink)](tag(s.spelling), k);
    return [imp, pre, body].filter(Boolean).join('\n');
  },
};
