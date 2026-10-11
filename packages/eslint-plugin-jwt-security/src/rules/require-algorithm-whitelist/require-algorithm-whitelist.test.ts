/**
 * Tests for require-algorithm-whitelist rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAlgorithmWhitelist } from './index';

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

describe('require-algorithm-whitelist', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with algorithms', requireAlgorithmWhitelist, {
      valid: [
        {
          name: 'an explicit algorithms list',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256'] });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        }, // sign not checked
        // Only one argument - edge case
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
        },
        // jwtVerify with algorithms
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { algorithms: ['RS256'] });`,
        },
      ],
      invalid: [
        /*
         * These two were `valid` until 2026-09-10, asserting that a misspelled
         * option counted as pinning the algorithm.
         *
         * It does not. Checked against the installed packages:
         * jsonwebtoken's VerifyOptions declares `algorithms?: Algorithm[]` and
         * jose's declares `algorithms?: JWSAlgorithm[]`; neither has a singular
         * `algorithm` on the verify path — that is a SIGN option — and `alg` is
         * a header claim. Both spellings are silently ignored, so verification
         * proceeds with whatever algorithm the token itself names.
         *
         * The rule was therefore quietest exactly where an author had tried to
         * do the right thing and mistyped it.
         */
        {
          name: 'the singular `algorithm` is a sign option and pins nothing on verify',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithm: 'RS256' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          name: '`alg` is a header claim, not a verify option',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { alg: 'RS256' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
      ],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no algorithms', requireAlgorithmWhitelist, {
      valid: [],
      invalid: [
        {
          name: 'verify with no algorithms list accepts whatever the token claims',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { complete: true });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        // verifyJWT without algorithms
        {
          code: `import jwt from 'jsonwebtoken';
verifyJWT(token, key, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
      ],
    });
  });
});

/*
 * FP/FN audit 2026-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md).
 *
 * Options are resolved STRUCTURALLY: a same-file `const`, an `as` /
 * `satisfies` cast, a spread of such a const. Anything that cannot be seen
 * (a parameter, an import, a call) is OPAQUE and the rule stays silent rather
 * than reporting an option it cannot prove is missing.
 */
describe('require-algorithm-whitelist — options resolution (audit 2026-10)', () => {
  ruleTester.run('options resolution', requireAlgorithmWhitelist, {
    valid: [
      {
        name: 'FP-1: options in a same-file const',
        code: `import jwt from 'jsonwebtoken';
const verifyOptions = { algorithms: ['RS256'], issuer: 'i' };
jwt.verify(token, key, verifyOptions);`,
      },
      {
        name: 'FP-1: an `as` cast around the options literal',
        code: `import jwt, { type VerifyOptions } from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'] } as VerifyOptions);`,
      },
      {
        name: 'FP-1: a `satisfies` clause around the options literal',
        code: `import jwt, { type VerifyOptions } from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'] } satisfies VerifyOptions);`,
      },
      {
        name: 'FP-1: a spread of a const that carries algorithms',
        code: `import jwt from 'jsonwebtoken';
const base = { algorithms: ['RS256'] };
jwt.verify(token, key, { ...base, audience: aud });`,
      },
      {
        name: 'FP-1: options from a parameter are opaque, so silent',
        code: `import jwt from 'jsonwebtoken';
export function check(token, key, opts) { return jwt.verify(token, key, opts); }`,
      },
      {
        name: 'FP-1: options from an import are opaque, so silent',
        code: `import jwt from 'jsonwebtoken';
import { verifyOptions } from './config';
jwt.verify(token, key, verifyOptions);`,
      },
      {
        name: 'FP-1: options built by a call are opaque, so silent',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, buildOptions());`,
      },
      {
        name: 'FP-1: a spread of an unresolvable value is opaque',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { ...getDefaults(), audience: aud });`,
      },
      {
        name: 'FP-1: a spread of a non-object makes the options opaque',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { ...'x', audience: aud });`,
      },
      {
        name: 'FP-1: a let binding can be reassigned, so it is opaque',
        code: `import jwt from 'jsonwebtoken';
let opts = {};
opts = load();
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-1: a destructured const is a read of something else',
        code: `import jwt from 'jsonwebtoken';
const { opts } = config;
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-1: an ambient declare const has no visible value',
        code: `import jwt from 'jsonwebtoken';
declare const opts: object;
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-2: NestJS verify takes options as the second argument',
        code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  check(token) { return this.jwtService.verify(token, { secret: s, algorithms: ['HS256'] }); }
}`,
      },
      {
        name: 'FP-2: NestJS per-call options merge over module verifyOptions',
        code: `import { JwtService } from '@nestjs/jwt';
class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  check(token) { return this.jwtService.verify(token, { secret: process.env.S }); }
}`,
      },
      {
        name: 'FP-2: a two-argument object literal is NestJS-shaped',
        code: `import { JwtService } from '@nestjs/jwt';
export const check = (jwtService, token) => jwtService.verify(token, { secret: s });`,
      },
      {
        name: 'FN-3: verifyAsync merges module options; options at index 1',
        code: `import { JwtService } from '@nestjs/jwt';
export const check = (svc, token) => svc.verifyAsync(token);`,
      },
      {
        name: 'FP-3: a node:crypto Verify object is not a JWT client',
        code: `import jwt from 'jsonwebtoken';
import { createVerify } from 'node:crypto';
export function ok(body, sig, pub) {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(body);
  return verifier.verify(pub, sig, 'base64');
}`,
      },
      {
        name: 'FP-3: a lazily required crypto module is not a JWT client',
        code: `import jwt from 'jsonwebtoken';
export function ok(data, sig, pub) {
  const nodeCrypto = require('crypto');
  return nodeCrypto.verify('sha256', data, pub, sig);
}`,
      },
      {
        name: 'FP-3: the WebCrypto global is not a JWT client',
        code: `import { jwtVerify } from 'jose';
export const ok = (key, sig, data) => crypto.subtle.verify('HMAC', key, sig, data);`,
      },
      {
        name: 'FP-3: an awaited construction from a foreign module',
        code: `import jwt from 'jsonwebtoken';
import { Webhook } from 'svix';
export async function ok(payload, headers) {
  const wh = await new Webhook(secret);
  return wh.verify(payload, headers);
}`,
      },
      {
        name: 'FP-4: an injected service typed from a non-JWT module',
        code: `import { JwtService } from '@nestjs/jwt';
import { HashingService } from './hashing.service';
class AuthService {
  constructor(private readonly jwt: JwtService, private readonly hashingService: HashingService) {}
  signIn(pw, hash) { return this.hashingService.verify(pw, hash); }
}`,
      },
      {
        name: 'FP-4: a class property typed from a non-JWT module',
        code: `import { JwtService } from '@nestjs/jwt';
import { TotpService } from 'some-otp-lib';
class AuthService {
  private readonly totp: TotpService;
  check(code) { return this.totp.verify(code, 'base32'); }
}`,
      },
    ],
    invalid: [
      {
        name: 'FP-1 keeps recall: a const that lacks algorithms',
        code: `import jwt from 'jsonwebtoken';
const verifyOptions = { issuer: 'i' };
jwt.verify(token, key, verifyOptions);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'FP-1 keeps recall: a spread of a const that lacks algorithms',
        code: `import jwt from 'jsonwebtoken';
const base = { issuer: 'i' };
jwt.verify(token, key, { ...base, audience: aud });`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a callback in the options slot is not options',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, (err, decoded) => {});`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a named callback in the options slot is not options',
        code: `import jwt from 'jsonwebtoken';
function onVerified(err, decoded) {}
jwt.verify(token, key, onVerified);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a self-referencing const resolves to nothing visible',
        code: `import jwt from 'jsonwebtoken';
const a = b; const b = c; const c = d; const d = e; const e = f; const f = {};
jwt.verify(token, key, a);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a `{ key, passphrase }` second argument IS the key, so options are third',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, { key: pem, passphrase: p });`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a member typed with a qualified name has no single import',
        code: `import jwt from 'jsonwebtoken';
class A {
  private readonly k: ns.Type;
  run(token) { return this.k.verify(token, key); }
}`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a const receiver built by a JWT-library call is still checked',
        code: `import jwt from 'jsonwebtoken';
import { createVerifier } from 'fast-jwt';
const client = createVerifier({ key });
client.verify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a const receiver from a local factory is unknown, so still checked',
        code: `import jwt from 'jsonwebtoken';
const client = makeClient();
client.verify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a const receiver that is not constructed is still checked',
        code: `import jwt from 'jsonwebtoken';
const j = jwt;
j.verify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a const receiver from a computed callee is still checked',
        code: `import jwt from 'jsonwebtoken';
const j = (() => jwt)();
j.verify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'this.verify() names no member to type-check',
        code: `import jwt from 'jsonwebtoken';
class A { run(token) { return this.verify(token, key); } }`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'this.<member> outside any class is left alone',
        code: `import jwt from 'jsonwebtoken';
const o = { run(token) { return this.jwt.verify(token, key); } };`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a union-typed member has no single source',
        code: `import jwt from 'jsonwebtoken';
import { Foo } from './foo';
class A {
  constructor(private readonly j: Foo | Bar, plain: Foo, private readonly q = 1) {}
  m() {}
  #hidden = 1;
  run(token) { return this.j.verify(token, key); }
}`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a member typed with an un-imported name is left alone',
        code: `import jwt from 'jsonwebtoken';
class A {
  private readonly j: Ambient;
  run(token) { return this.j.inner.verify(token, key); }
}`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a member typed from @nestjs/jwt with jsonwebtoken arity',
        code: `import { JwtService } from '@nestjs/jwt';
class A {
  private readonly j!: JwtService;
  untyped;
  run(token) { return this[name].verify(token, key); }
}`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a bound crypto name that is not the WebCrypto global is still checked',
        code: `import jwt from 'jsonwebtoken';
export function f(crypto) { return crypto.verify(token, key); }`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'an unbound receiver that is not crypto is still checked',
        code: `import jwt from 'jsonwebtoken';
someGlobal.verify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a namespace that is not a codec is still checked',
        code: `import jwt from 'jsonwebtoken';
import { other, 'quoted' as q } from 'jose';
other.verify(token, key);
q.verify(token, key);`,
        errors: [
          { messageId: 'missingAlgorithmWhitelist' },
          { messageId: 'missingAlgorithmWhitelist' },
        ],
      },
    ],
  });
});
