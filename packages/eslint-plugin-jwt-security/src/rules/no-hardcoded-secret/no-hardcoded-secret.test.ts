/**
 * Tests for no-hardcoded-secret rule
 * Security: CWE-798 (Hardcoded Credentials)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedSecret } from './index';

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

describe('no-hardcoded-secret', () => {
  describe('Valid Code - Safe Key Sources', () => {
    ruleTester.run('valid - environment and config', noHardcodedSecret, {
      valid: [
        // Environment variable
        {
          name: 'the secret comes from the environment',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, process.env.JWT_SECRET);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.JWT_SECRET);`,
        },
        // Variable reference
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, privateKey);`,
        },
        // Function call
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, getSecretKey());`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, await loadPublicKey());`,
        },
        // Config object
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, config.jwtSecret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, settings.publicKey);`,
        },
        // Async key loading
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, await importJWK(jwk));`,
        },
        // crypto operations
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, crypto.randomBytes(32));`,
        },
        // Only 1 argument - edge case (line 156 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
        },
        // MemberExpression that's not hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, keys.current);`,
        },
        // signJWT with env var
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, process.env.SECRET);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Hardcoded Secrets', () => {
    ruleTester.run('invalid - hardcoded strings', noHardcodedSecret, {
      valid: [],
      invalid: [
        // String literal
        {
          name: 'the signing secret is a literal in the source',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'my-secret-key');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Long string (still hardcoded)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'this-is-a-very-long-secret-but-still-hardcoded');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Template literal without variables
        {
          code: 'import jwt from "jsonwebtoken";\njwt.sign(payload, `my-secret-key`);',
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // Verify with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, 'hardcoded-public-key');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // PEM key inline. A PRIVATE key is a secret. (Audit 2026-10: this case
        // used to be a PUBLIC key, which is published on purpose and is not a
        // CWE-798 credential — that spelling now lives in the valid block
        // below, and the private-key spelling keeps the recall it was guarding.)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, '-----BEGIN PRIVATE KEY-----\\\\nMIIEvQ...');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // signJWT with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, 'hardcoded');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
        // sign() direct call with hardcoded
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, 'secret123');`,
          errors: [{ messageId: 'hardcodedSecret' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-hardcoded-secret — audit 2026-10', () => {
  ruleTester.run('structural key resolution', noHardcodedSecret, {
    valid: [
      {
        name: 'FP-8: a PEM PUBLIC key is published on purpose, not a secret',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, '-----BEGIN PUBLIC KEY-----\\\\nMIIBIj...');`,
      },
      {
        name: 'FP-8: a PEM public key held in a const',
        code: `import jwt from 'jsonwebtoken';
const IDP_PUBLIC_KEY = \`-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE
-----END PUBLIC KEY-----\`;
jwt.verify(token, IDP_PUBLIC_KEY, { algorithms: ['ES256'] });`,
      },
      {
        name: 'FP-8: a certificate is public material too',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, '-----BEGIN CERTIFICATE-----\\\\nMIIC...');`,
      },
      {
        name: 'FP-9: a fixture secret in a test file',
        filename: 'src/auth/auth.middleware.test.ts',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'u1' }, 'test-secret', { expiresIn: '1h' });`,
      },
      {
        name: 'FP-3: a node:crypto Sign object — its second argument is an encoding',
        code: `import jwt from 'jsonwebtoken';
import { createSign } from 'node:crypto';
const signer = createSign('RSA-SHA1');
signer.sign(privateKey, 'base64');`,
      },
      {
        name: 'FP-4: an injected non-JWT service',
        code: `import { JwtService } from '@nestjs/jwt';
import { TotpService } from './totp.service';
class A {
  constructor(private readonly totp: TotpService) {}
  run(code) { return this.totp.verify(code, 'base32'); }
}`,
      },
      {
        name: 'an env fallback to another env var holds no literal',
        code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, process.env.JWT_SECRET || process.env.LEGACY_SECRET);`,
      },
      {
        name: 'a NestJS secret from the environment',
        code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, p) => svc.sign(p, { secret: process.env.S, expiresIn: '1h' });`,
      },
      {
        name: 'NestJS signAsync(payload) takes its secret from the module',
        code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, p) => svc.signAsync(p);`,
      },
      {
        name: 'JwtModule.register with an env secret and a computed key',
        code: `import { JwtModule } from '@nestjs/jwt';
JwtModule.register({ [dynamicKey]: 'x', secret: process.env.JWT_SECRET });`,
      },
      {
        name: 'JwtModule.registerAsync is not read (its factory runs elsewhere)',
        code: `import { JwtModule } from '@nestjs/jwt';
JwtModule.registerAsync({ useFactory: () => ({ secret: 'not-visible-here' }) });`,
      },
      {
        name: 'a non-member call bound to @nestjs/jwt is not a config call',
        code: `import nestJwt from '@nestjs/jwt';
nestJwt({ secret: 'x' });`,
      },
      {
        name: 'a config call with no object is ignored',
        code: `import { expressjwt } from 'express-jwt';
expressjwt();`,
      },
      {
        name: 'a call whose callee root is not an identifier is ignored',
        code: `import jwt from 'jsonwebtoken';
getMiddleware()({ secret: 'x' });`,
      },
      {
        name: 'a jose builder signing with an imported key',
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub }).setProtectedHeader({ alg: 'ES256' }).sign(await loadPrivateKey());`,
      },
    ],
    invalid: [
      {
        name: 'FN-1: an env var with a hardcoded || fallback',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-1: an env var with a hardcoded ?? fallback',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, process.env.JWT_SECRET ?? 'changeme', { expiresIn: '1h' });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        // Locked on purpose (PR #1188 review): when the guard is truthy the
        // right-hand literal IS the signing key, so it ships in the bundle.
        name: 'a guarded && literal is still a hardcoded key',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, FEATURE_FLAG && 'hardcoded-key', { expiresIn: '1h' });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-1: the fallback held in a module-level const',
        code: `import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-1: a TextEncoder byte key held in a const',
        code: `import { jwtVerify } from 'jose';
const key = new TextEncoder().encode('secret');
await jwtVerify(token, key, { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-1: a const that refers to itself still yields its literal',
        code: `import jwt from 'jsonwebtoken';
const s = s || 'secret';
jwt.sign(p, s);`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: "FN-2: jose's SignJWT(...).sign(key) with a literal byte key",
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('2h')
  .sign(new TextEncoder().encode('secret'));`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-3: a NestJS per-call secret',
        code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, p) => svc.signAsync(p, { secret: 'secretKey' });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-3: JwtModule.register with a literal secret',
        code: `import { JwtModule } from '@nestjs/jwt';
JwtModule.register({ secret: 'secretKey', signOptions: { expiresIn: '60s' } });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: "FN-4: express-jwt's README secret",
        code: `import { expressjwt } from 'express-jwt';
app.use(expressjwt({ secret: 'shhhhhhared-secret', algorithms: ['HS256'] }));`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-4: a passport-jwt strategy secretOrKey',
        code: `import { Strategy as JwtStrategy } from 'passport-jwt';
passport.use(new JwtStrategy({ secretOrKey: 'secret', jwtFromRequest }, verify));`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'FN-4: a fast-jwt signer key',
        code: `import { createSigner } from 'fast-jwt';
const sign = createSigner({ key: 'secret' });`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10)
// ---------------------------------------------------------------------------
describe('no-hardcoded-secret — injected member evidence', () => {
  ruleTester.run('this.<member> evidence', noHardcodedSecret, {
    valid: [
      {
        // @found FP-4 residual, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FP: an untyped injected member signing with a literal is not a JWT call',
        code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  constructor(private readonly signer) {}
  run(p) { return this.signer.sign(p, 'not-a-jwt-secret'); }
}`,
      },
    ],
    invalid: [
      {
        name: 'an @Inject(JwtService) member signing with a literal secret',
        code: `import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
class AuthService {
  constructor(@Inject(JwtService) private readonly jwt) {}
  run(p) { return this.jwt.sign(p, { secret: 'secretKey' }); }
}`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'a member constructed as a JwtService signing with a literal secret',
        code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  private readonly jwt = new JwtService({});
  run(p) { return this.jwt.sign(p, { secret: 'secretKey' }); }
}`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  });
});
