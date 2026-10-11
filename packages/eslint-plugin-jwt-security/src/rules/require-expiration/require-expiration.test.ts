/**
 * Tests for require-expiration rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as espree from 'espree';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { requireExpiration } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-expiration', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with expiration', requireExpiration, {
      valid: [
        // expiresIn option
        {
          name: 'expiresIn is set',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: 3600 });`,
        },
        // exp in payload
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', exp: 1234567890 }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ exp: Math.floor(Date.now()/1000) + 3600 }, secret);`,
        },
        // verify not checked
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // signJWT with expiresIn
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, key, { expiresIn: '1h' });`,
        },
        // Zero arguments - edge case (line 118 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign();`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no expiration', requireExpiration, {
      valid: [],
      invalid: [
        {
          name: 'a token signed with no expiry is valid forever',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, {});`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h',});`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, key);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
sign(payload, key, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        // signJWT without expiration
        {
          code: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Corpus regression: an `exp` claim set on a payload BUILT ABOVE THE CALL
// ---------------------------------------------------------------------------
// twilio's ClientCapability.toJwt() (src/jwt/ClientCapability.ts:159) assigns
// the payload to a variable and sets `exp: now + this.ttl` on it before
// signing. Checking only an inline object literal reported a token whose
// expiration was right there, spelled the other legal way.
ruleTester.run('require-expiration (corpus)', requireExpiration, {
  valid: [
    `import jwt from 'jsonwebtoken';
     const payload = { scope, iss: sid, exp: Math.floor(Date.now() / 1000) + ttl };
     jwt.sign(payload, secret);`,
    // Quoted claim key is the same claim.
    `import jwt from 'jsonwebtoken';
     const payload = { 'exp': 123 };
     jwt.sign(payload, secret);`,
  ],
  invalid: [
    // A payload arriving as a PARAMETER cannot be resolved, so it stays a
    // finding — the rule must not treat "unresolvable" as "has an exp".
    {
      code: `import jwt from 'jsonwebtoken';
     function issue(payload) { return jwt.sign(payload, secret); }`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Declared without an initialiser: nothing to read a claim from.
    {
      code: `import jwt from 'jsonwebtoken';
     let payload;
     payload = build();
     jwt.sign(payload, secret);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Resolvable, and genuinely missing the claim.
    {
      code: `import jwt from 'jsonwebtoken';
     const payload = { sub: id };
     jwt.sign(payload, secret);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
  ],
});

// ---------------------------------------------------------------------------
// jose's fluent builder
// ---------------------------------------------------------------------------
// `new SignJWT(claims).setProtectedHeader(...).sign(key)` puts the expiry
// several links away from the call the rule sees. auth0's
// express-openid-connect writes it both ways: `lib/client.js:385` sets
// `exp: now + 60` on the claims object passed to the constructor, and
// `end-to-end/fixture/helpers.js:116` sets neither — which is a real finding.
ruleTester.run('require-expiration — jose builder', requireExpiration, {
  valid: [
    // Expiry set fluently, mid-chain.
    `import { SignJWT } from 'jose';\nnew SignJWT({ sub: id }).setExpirationTime('2h').sign(key);`,
    // Expiry declared on the claims object at the chain root.
    `import { SignJWT } from 'jose';\nconst payload = { sub: id, exp: now + 60 };\nnew SignJWT(payload).setProtectedHeader({ alg }).sign(key);`,
    // Namespaced constructor.
    `import * as jose from 'jose';\nnew jose.SignJWT({ sub: id }).setExpirationTime('2h').sign(key);`,
    // JWS signers carry no claim set, so "missing exp" cannot be true of them.
    `import { FlattenedSign } from 'jose';\nnew FlattenedSign(bytes).setProtectedHeader({ alg }).sign(key);`,
    `import { CompactSign } from 'jose';\nnew CompactSign(bytes).sign(key);`,
    `import { GeneralSign } from 'jose';\nnew GeneralSign(bytes).sign(key);`,
  ],
  invalid: [
    // The corpus finding: issued-at set, expiry never.
    {
      code: `import * as jose from 'jose';\nconst claims = { sub: id };\nnew jose.SignJWT(claims).setIssuedAt().sign(privateKey);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // FN: a reused builder. Only calls BEFORE this .sign() configure it; an
    // expiry set afterwards applies to the next sign, not this one. (PR #1188 review)
    {
      name: 'a builder signed before its expiry is set is missing expiration',
      code: `import { SignJWT } from 'jose';\nconst builder = new SignJWT({ sub: id });\nawait builder.sign(key);\nbuilder.setExpirationTime('1h');`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Claims object present at the root but carrying no exp.
    {
      code: `import { SignJWT } from 'jose';\nnew SignJWT({ sub: id }).setProtectedHeader({ alg }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // A chain rooted in something that is not a constructor at all.
    {
      code: `import { SignJWT } from 'jose';\nbuilder().setProtectedHeader({ alg }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Computed constructor name — nothing to compare against.
    {
      code: `import * as jose from 'jose';\nnew jose[name]({ sub: id }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // A string-literal member, which is not an Identifier property.
    {
      code: `import * as jose from 'jose';\nnew jose['SignJWT']({ sub: id }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    // Constructor called with no arguments: no claims to inspect.
    {
      code: `import { SignJWT } from 'jose';\nnew SignJWT().sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
  ],
});

// The corpus path is now ignored by scripts/corpus-scan.ts (`end-to-end/` and
// `fixture/` are test infrastructure — see scripts/lib/corpus-scan-ignores.ts),
// so the scan will never exercise this shape again. The RULE behaviour is
// unchanged and stays pinned here: a jose builder chain that sets an issuer, an
// audience, an issued-at and a JTI but never an expiry is still a finding.
//
// Corpus: auth0/express-openid-connect end-to-end/fixture/helpers.js:116.
ruleTester.run(
  'require-expiration — the auth0 logout-token builder',
  requireExpiration,
  {
    valid: [
      `import * as jose from 'jose';
const logoutToken = await new jose.SignJWT(claims)
  .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt' })
  .setIssuer(issuer)
  .setAudience(clientId)
  .setIssuedAt()
  .setExpirationTime('5m')
  .sign(privateKey);`,
    ],
    invalid: [
      {
        code: `import * as jose from 'jose';
const logoutToken = await new jose.SignJWT(claims)
  .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt' })
  .setIssuer(issuer)
  .setAudience(clientId)
  .setIssuedAt()
  .setJti(jti)
  .sign(privateKey);`,
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
ruleTester.run('require-expiration (audit 2026-10)', requireExpiration, {
  valid: [
    {
      name: 'FP-1: sign options in a same-file const',
      code: `import jwt from 'jsonwebtoken';
const signOptions = { algorithm: 'RS256', expiresIn: '15m' };
jwt.sign({ sub }, key, signOptions);`,
    },
    {
      name: 'FP-1: sign options behind an as-cast (@types/jsonwebtoken StringValue)',
      code: `import jwt, { type SignOptions } from 'jsonwebtoken';
jwt.sign({ sub }, key, { expiresIn: process.env.JWT_EXPIRES_IN } as SignOptions);`,
    },
    {
      name: 'FP-1: unresolvable sign options stay silent',
      code: `import jwt from 'jsonwebtoken';
export const issue = (sub, key, opts) => jwt.sign({ sub }, key, opts);`,
    },
    {
      name: 'FP-2: NestJS sign(payload, { expiresIn }) — options are the second argument',
      code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  refresh(sub) { return this.jwtService.sign({ sub }, { secret: process.env.R, expiresIn: '7d' }); }
}`,
    },
    {
      name: 'FP-2: NestJS sign(payload) takes expiresIn from JwtModule signOptions',
      code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  login(sub) { return { access_token: this.jwtService.sign({ sub }) }; }
}`,
    },
    {
      name: 'FN-3: signAsync(payload) merges module signOptions',
      code: `import { JwtService } from '@nestjs/jwt';
export const login = (jwtService, sub) => jwtService.signAsync({ sub });`,
    },
    {
      name: 'FP-3: a node:crypto Sign object is not a JWT signer',
      code: `import jwt from 'jsonwebtoken';
import { createSign } from 'node:crypto';
export function signPolicy(policy, privateKey) {
  const signer = createSign('RSA-SHA1');
  signer.update(policy);
  return signer.sign(privateKey, 'base64');
}`,
    },
    {
      name: 'FP-3: WebCrypto subtle.sign is not a JWT signer',
      code: `import { SignJWT } from 'jose';
export const mac = (key, data) => crypto.subtle.sign('HMAC', key, data);`,
    },
    {
      name: 'FP-13: a jose builder held in a const, expiry set in its own statement',
      code: `import { SignJWT } from 'jose';
const builder = new SignJWT({ sub }).setProtectedHeader({ alg: 'ES256' });
builder.setExpirationTime('1h');
await builder.sign(key);`,
    },
  ],
  invalid: [
    {
      name: 'a const sign-options object that lacks expiresIn still reports',
      code: `import jwt from 'jsonwebtoken';
const signOptions = { algorithm: 'RS256' };
jwt.sign({ sub }, key, signOptions);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    {
      name: 'a jose builder held in a const with no expiry anywhere still reports',
      code: `import { SignJWT } from 'jose';
const builder = new SignJWT({ sub }).setProtectedHeader({ alg: 'ES256' });
builder.setIssuedAt();
const unused = builder;
await builder.sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    {
      name: 'a builder from a non-jose constructor still reports',
      code: `import { SignJWT } from 'jose';
new (pick())({ sub }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    {
      name: 'a builder const that refers to itself resolves to nothing',
      code: `import { SignJWT } from 'jose';
const b = b.setProtectedHeader({ alg });
b.setIssuedAt().sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
    {
      name: 'a builder whose root is a parameter still reports',
      code: `import { SignJWT } from 'jose';
export const f = (b, key) => b.setProtectedHeader({ alg }).sign(key);`,
      errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10): NestJS module signOptions, cross-file.
//
// `this.jwtService.sign(payload)` takes `expiresIn` from
// `JwtModule.register({ signOptions })`, which lives in a `*.module.ts`
// elsewhere in the package. The rule walks up to the nearest package.json,
// reads every `*.module.ts` that registers JwtModule, and reports only when
// the registration it can read sets no expiresIn. No module found, or one it
// cannot read, means it abstains.
// ---------------------------------------------------------------------------
const nestProject = (
  modules: Record<string, string>,
  withPackageJson = true,
): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-nest-'));
  if (withPackageJson) {
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}');
  }
  for (const [file, source] of Object.entries(modules)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), source);
  }
  fs.mkdirSync(path.join(root, 'src', 'auth'), { recursive: true });
  return path.join(root, 'src', 'auth', 'auth.service.ts');
};

const SERVICE = `import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  login(sub: string) { return this.jwtService.sign({ sub }); }
}`;

const SERVICE_ASYNC = `import { JwtService } from '@nestjs/jwt';
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  login(sub: string) { return this.jwtService.signAsync({ sub }, { secret: process.env.S }); }
}`;

const MODULE = (options: string, method = 'register'): string =>
  `import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
@Module({ imports: [JwtModule.${method}(${options})] })
export class AuthModule {}`;

ruleTester.run(
  'require-expiration — NestJS module signOptions',
  requireExpiration,
  {
    valid: [
      {
        name: 'JwtModule.register sets signOptions.expiresIn',
        filename: nestProject({
          'src/auth/auth.module.ts': MODULE(
            "{ secret: process.env.S, signOptions: { expiresIn: '15m' } }",
          ),
        }),
        code: SERVICE,
      },
      {
        name: 'the register options held in a const',
        filename: nestProject({
          'src/auth/auth.module.ts': `import { JwtModule } from '@nestjs/jwt';
const jwtOptions = { secret: process.env.S, signOptions: { 'expiresIn': '1h' } };
export const imports = [JwtModule.register(jwtOptions)];`,
        }),
        code: SERVICE,
      },
      {
        name: 'registerAsync whose factory returns signOptions.expiresIn',
        filename: nestProject({
          'src/app.module.ts': MODULE(
            "{ useFactory: (config) => ({ secret: config.get('S'), signOptions: { expiresIn: config.get('TTL') } }) }",
            'registerAsync',
          ),
        }),
        code: SERVICE_ASYNC,
      },
      {
        name: 'registerAsync whose factory result cannot be read is not judged',
        filename: nestProject({
          'src/app.module.ts': MODULE(
            "{ useFactory: (config) => config.get('jwt') }",
            'registerAsync',
          ),
        }),
        code: SERVICE,
      },
      {
        name: 'registerAsync with useClass is not judged',
        filename: nestProject({
          'src/app.module.ts': MODULE(
            '{ useClass: JwtConfig }',
            'registerAsync',
          ),
        }),
        code: SERVICE,
      },
      {
        name: 'register called with a value the module file cannot see',
        filename: nestProject({
          'src/app.module.ts': MODULE('loadJwtOptions()'),
        }),
        code: SERVICE,
      },
      {
        name: 'no module registers JwtModule, so nothing is known',
        filename: nestProject({
          'src/app.module.ts': `import { Module } from '@nestjs/common';
@Module({})
export class AppModule {}`,
          'src/other.module.ts': `export const JwtModule = 1; JwtModule.register;`,
        }),
        code: SERVICE,
      },
      {
        name: 'a module file that does not parse is skipped',
        filename: nestProject({
          'src/broken.module.ts': 'JwtModule.register({ signOptions: { ',
        }),
        code: SERVICE,
      },
      {
        name: 'JwtModule imported from somewhere else is not @nestjs/jwt',
        filename: nestProject({
          'src/app.module.ts': `import { JwtModule } from './my-jwt';
JwtModule.register({ secret: 's' });`,
        }),
        code: SERVICE,
      },
      {
        name: 'modules under node_modules and dist are not scanned',
        filename: nestProject({
          'node_modules/lib/x.module.ts': MODULE('{ secret: process.env.S }'),
          'dist/app.module.ts': MODULE('{ secret: process.env.S }'),
          'src/auth/auth.module.ts': MODULE(
            '{ secret: process.env.S, signOptions: { expiresIn: 900 } }',
          ),
        }),
        code: SERVICE,
      },
      {
        name: 'no package.json above the file: no root, no judgement',
        filename: nestProject(
          { 'src/auth/auth.module.ts': MODULE('{ secret: process.env.S }') },
          false,
        ),
        code: SERVICE,
      },
    ],
    invalid: [
      {
        // @found FN-3b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FN: sign(payload) when JwtModule.register sets no expiresIn',
        filename: nestProject({
          'src/auth/auth.module.ts': MODULE(
            '{ secret: process.env.JWT_SECRET }',
          ),
        }),
        code: SERVICE,
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
      {
        // @found FN-3b, reasoned during the 2026-10-10 zero-deferral pass
        name: 'FN: signAsync with per-call options and no module expiresIn',
        filename: nestProject({
          'src/app.module.ts': MODULE(
            "{ useFactory: async () => { return { secret: process.env.S, signOptions: { algorithm: 'HS256' } }; } }",
            'registerAsync',
          ),
        }),
        code: SERVICE_ASYNC,
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
      {
        name: 'one of two registrations sets no expiresIn',
        filename: nestProject({
          'src/a.module.ts': MODULE(
            "{ secret: process.env.S, signOptions: { expiresIn: '1h' } }",
          ),
          'src/b/b.module.ts': `const { JwtModule } = require('@nestjs/jwt');
module.exports = JwtModule.registerAsync({ useFactory: function () { return { secret: 'x' }; } });`,
        }),
        code: SERVICE,
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
      {
        name: 'a plain-JS service whose JwtService is constructed in place',
        filename: nestProject({
          'src/auth/auth.module.ts': MODULE(
            '{ secret: process.env.JWT_SECRET }',
          ),
        }),
        code: `import { JwtService } from '@nestjs/jwt';
export class AuthService {
  constructor() { this.jwt = new JwtService(); }
  login(sub) { return this.jwt.sign({ sub }); }
}`,
        languageOptions: { parser: espree },
        errors: [{ messageId: 'missingExpiration', suggestions: 1 }],
      },
    ],
  },
);
