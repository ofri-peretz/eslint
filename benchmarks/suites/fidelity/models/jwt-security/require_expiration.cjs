const { tag, num } = require('../../lib.cjs');
const { spell } = require('../../jwt.cjs');

const NOW = 'Math.floor(Date.now() / 1000)';
// [preamble, payload, options ('' = none)]
const LIFETIMES = {
  NoOptions: ['', 'payload', ''],
  EmptyOptions: ['', 'payload', '{}'],
  OtherOptionOnly: ['', 'payload', "{ algorithm: 'RS256' }"],
  ExpiresIn15m: ['', 'payload', "{ expiresIn: '15m' }"],
  ExpiresIn7d: ['', 'payload', "{ expiresIn: '7d' }"],
  ExpiresInSeconds3600: ['', 'payload', '{ expiresIn: 3600 }'],
  ExpiresInArith1d: ['', 'payload', '{ expiresIn: 60 * 60 * 24 }'],
  ExpiresInMsString: ['', 'payload', "{ expiresIn: '7200' }"],
  ExpiresInConst2h: [
    "const TOKEN_TTL = '2 hours';",
    'payload',
    '{ expiresIn: TOKEN_TTL }',
  ],
  ExpiresInEnv: ['', 'payload', '{ expiresIn: process.env.JWT_TTL }'],
  ConstOptions15m: [
    "const signOptions = { algorithm: 'RS256', expiresIn: '15m' };",
    'payload',
    'signOptions',
  ],
  CastOptionsEnv: [
    '',
    'payload',
    '{ expiresIn: process.env.JWT_EXPIRES_IN } as SignOptions',
  ],
  SpreadConst7d: [
    "const base = { expiresIn: '7d' };",
    'payload',
    "{ ...base, algorithm: 'RS256' }",
  ],
  PayloadExp1h: ['', `{ sub: user.id, exp: ${NOW} + 3600 }`, ''],
  PayloadExp30d: ['', `{ sub: user.id, exp: ${NOW} + 60 * 60 * 24 * 30 }`, ''],
  PayloadExpAbsolute: ['', '{ sub: user.id, exp: 1999999999 }', ''],
  OptionsFromCall: ['', 'payload', 'getSignOptions()'],
  OptionsFromParam: ['', 'payload', 'opts'],
};

const JOSE = {
  JoseNoExpiry: `return await new SignJWT(payload).setProtectedHeader({ alg: 'ES256' }).sign(key);`,
  JoseInline1h: `return await new SignJWT(payload).setProtectedHeader({ alg: 'ES256' }).setExpirationTime('1h').sign(key);`,
  JoseSeparate1h: `const builder = new SignJWT(payload).setProtectedHeader({ alg: 'ES256' });\n  builder.setExpirationTime('1h');\n  return await builder.sign(key);`,
};

// NestJS: the service signs with no options; the registration is elsewhere.
const NEST_SERVICE = `import { JwtService } from '@nestjs/jwt';
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  login(sub: string) { return this.jwtService.sign({ sub }); }
}`;
const MODULE = (opts) =>
  `import { Module } from '@nestjs/common';\nimport { JwtModule } from '@nestjs/jwt';\n@Module({ imports: [JwtModule.register(${opts})] })\nexport class AuthModule {}`;
const ROOT = (opts) =>
  `import { NestFactory } from '@nestjs/core';\nimport { JwtModule } from '@nestjs/jwt';\nconst app = await NestFactory.create({ imports: [JwtModule.register(${opts})] });\nawait app.listen(3000);`;
const NO_TTL = '{ secret: process.env.S }';
const TTL = "{ secret: process.env.S, signOptions: { expiresIn: '15m' } }";
// [file, source] holding the package's JwtModule registration.
const NEST = {
  NestModuleMissing: ['src/auth/auth.module.ts', MODULE(NO_TTL)],
  NestModuleSet: ['src/auth/auth.module.ts', MODULE(TTL)],
  NestRootMissing: ['src/main.ts', ROOT(NO_TTL)],
  NestBootstrapMissing: ['src/bootstrap.ts', ROOT(NO_TTL)],
  NestRootSet: ['src/main.ts', ROOT(TTL)],
  // Not a module and not a bootstrap: never read, so nothing is known.
  NestOtherFileMissing: ['src/domain.ts', ROOT(NO_TTL)],
};

const fn = (body) =>
  `export async function issue(payload: any, user: any, key: any, opts: any) {\n  ${body}\n}`;

module.exports = {
  rule: 'require-expiration',
  domain: 306, // (8 spellings x 18 lifetimes + jose x 3 + nest x 6) x 2 maxExpirationSeconds
  traces: 4000,
  key: (s) => `${tag(s.spelling)}|${tag(s.lifetime)}|max=${num(s.maxSecs)}`,
  config: (s) =>
    num(s.maxSecs) ? { maxExpirationSeconds: num(s.maxSecs) } : {},
  filename: (s) =>
    tag(s.spelling) === 'NestService' ? 'src/auth/auth.service.ts' : undefined,
  files: (s) => {
    if (tag(s.spelling) !== 'NestService') return undefined;
    const [file, source] = NEST[tag(s.lifetime)];
    return { 'package.json': '{"name":"fixture"}', [file]: source };
  },
  code: (s) => {
    const sp = tag(s.spelling);
    if (sp === 'NestService') return NEST_SERVICE;
    const l = tag(s.lifetime);
    if (sp === 'JoseChain')
      return ["import { SignJWT } from 'jose';", fn(JOSE[l])].join('\n');
    const [imp, c] = spell(sp, 'sign');
    const [pre, payload, opts] = LIFETIMES[l];
    const args = [payload, 'key', opts].filter(Boolean).join(', ');
    return [imp, pre, fn(`return ${c}(${args});`)].filter(Boolean).join('\n');
  },
};
