/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Intra-file value following (`value-flow.ts`), driven through real rules.
 *
 * Each case is one shape of "where does this value come from?" — a
 * destructure, a member of an object literal, a spread, a function's return,
 * a cycle, the depth bound — and asserts the verdict a rule reaches through
 * it. The walk either reaches the literal (and the rule reports) or stops at
 * something it cannot read (and the rule abstains).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedSecret } from '../rules/no-hardcoded-secret';
import { requireAlgorithmWhitelist } from '../rules/require-algorithm-whitelist';
import { noAlgorithmConfusion } from '../rules/no-algorithm-confusion';
import { noTimestampManipulation } from '../rules/no-timestamp-manipulation';
import { noDecodeWithoutVerify } from '../rules/no-decode-without-verify';
import { noSensitivePayload } from '../rules/no-sensitive-payload';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const H = "import jwt from 'jsonwebtoken';\n";
const hardcoded = [{ messageId: 'hardcodedSecret' as const }];

describe('value-flow: destructures, members and spreads', () => {
  ruleTester.run('secret resolution', noHardcodedSecret, {
    valid: [
      {
        name: 'an array destructure names no static path',
        code: `${H}const [s] = ['abc']; jwt.sign(p, s);`,
      },
      {
        name: 'a computed destructuring key names no static path',
        code: `${H}const { [k]: s } = { x: 'abc' }; jwt.sign(p, s);`,
      },
      {
        name: 'a key the object literal does not have',
        code: `${H}const { s } = { other: 'abc' }; jwt.sign(p, s);`,
      },
      {
        name: 'a nested key whose outer key is missing',
        code: `${H}const { a: { s } } = { c: 1 }; jwt.sign(p, s);`,
      },
      {
        name: 'a nested key whose outer value is not an object literal',
        code: `${H}const { a: { s } } = { a: load() }; jwt.sign(p, s);`,
      },
      {
        name: 'a member the object literal does not have',
        code: `${H}const cfg = { a: 'x' }; jwt.sign(p, cfg.secret);`,
      },
      {
        name: 'a computed member names no key',
        code: `${H}const cfg = { a: 'x' }; jwt.sign(p, cfg[k]);`,
      },
      {
        name: 'a key a spread of an unknown value could define',
        code: `${H}const cfg = { a: 1, ...other }; jwt.sign(p, cfg.secret);`,
      },
      {
        name: 'a key no spread of a known literal defines',
        code: `${H}const base = { a: 1 }; const cfg = { ...base }; jwt.sign(p, cfg.secret);`,
      },
      {
        name: 'a function with two returns has no single value',
        code: `${H}function pick(x) { if (x) return 'a'; return 'b'; } jwt.sign(p, pick(f));`,
      },
      {
        name: 'a binding that refers to itself is a cycle, not a value',
        code: `${H}const a = a; jwt.sign(p, a);`,
      },
      {
        name: 'a let assigned before use has no single value',
        code: `${H}let holder; holder = 'abc'; jwt.sign(p, holder);`,
      },
    ],
    invalid: [
      {
        name: 'a destructured default-carrying key with a literal value',
        code: `${H}const { secret = 'fallback' } = { secret: 'abc' }; jwt.sign(p, secret);`,
        errors: hardcoded,
      },
      {
        name: 'a nested destructure reaches the literal',
        code: `${H}const { jwt: { secret } } = { jwt: { secret: 'abc', ttl: 1 } }; jwt.sign(p, secret);`,
        errors: hardcoded,
      },
      {
        name: 'a member read reaches the literal',
        code: `${H}const config = { secret: 'abc', other: 1 }; jwt.sign(p, config.secret);`,
        errors: hardcoded,
      },
      {
        name: 'a member defined by a spread of a known literal',
        code: `${H}const base = { secret: 'abc' }; const cfg = { ...base, ttl: 1 }; jwt.sign(p, cfg.secret);`,
        errors: hardcoded,
      },
      {
        name: "a same-file function's single return",
        code: `${H}function getSecret() { const unused = () => 1; return 'abc'; } jwt.sign(p, getSecret());`,
        errors: hardcoded,
      },
      {
        name: 'an arrow function with an expression body',
        code: `${H}const getSecret = () => 'abc'; jwt.sign(p, getSecret());`,
        errors: hardcoded,
      },
      {
        name: 'an awaited value',
        code: `${H}const s = await 'abc'; jwt.sign(p, s);`,
        errors: hardcoded,
      },
    ],
  });

  ruleTester.run(
    'options through a destructure rest',
    requireAlgorithmWhitelist,
    {
      valid: [
        {
          name: 'options further than the walk bound are opaque, so silent',
          code: `${H}const a0 = {}; const a1 = a0; const a2 = a1; const a3 = a2; const a4 = a3; const a5 = a4; const a6 = a5; const a7 = a6; const a8 = a7; const a9 = a8; const a10 = a9; jwt.verify(t, k, a10);`,
        },
        {
          name: 'a rest element is not a static path, so the options are opaque',
          code: `${H}const { a, ...opts } = loadAll(); jwt.verify(t, k, opts);`,
        },
      ],
      invalid: [],
    },
  );
});

describe('value-flow: module origins and evidence', () => {
  ruleTester.run('injected-member evidence', requireAlgorithmWhitelist, {
    valid: [
      {
        name: 'a member set from a let with no initialiser has no origin',
        code: `${H}let holder;
class A { lib; constructor() { this.lib = holder; } run(t) { return this.lib.verify(t, key); } }`,
      },
      {
        name: 'a member set from a parameter has no origin',
        code: `${H}class A { lib; constructor(dep) { this.lib = dep; } run(t) { return this.lib.verify(t, key); } }`,
      },
      {
        name: 'a namespace alias import loads nothing',
        code: `${H}import Alias = Ns.Inner;
class A { lib = Alias; run(t) { return this.lib.verify(t, key); } }`,
      },
      {
        name: 'decorators that are bare or argument-less are no evidence',
        code: `${H}import { Optional, Expose } from '@nestjs/common';
class A { @Optional() @Expose private readonly lib; run(t) { return this.lib.verify(t, key); } }`,
      },
    ],
    invalid: [
      {
        name: 'an import-equals of jsonwebtoken is evidence',
        code: `import jsonwebtoken = require('jsonwebtoken');
class A { lib = jsonwebtoken; run(t) { return this.lib.verify(t, key); } }`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
    ],
  });

  ruleTester.run('public-key origins', noAlgorithmConfusion, {
    valid: [
      {
        name: 'a callee chain deeper than the walk bound has no origin',
        code: `${H}jwt.verify(t, a.b.c.d.e.f.g.h.i.j.k(), { algorithms: ['HS256'] });`,
      },
      {
        name: 'a call of a call from node:crypto names no export',
        code: `${H}import { createPublicKey as make } from 'node:crypto';
jwt.verify(t, make()(pem), { algorithms: ['HS256'] });`,
      },
      {
        name: 'a file read with no path argument',
        code: `${H}import { readFileSync } from 'node:fs';
jwt.verify(t, readFileSync(), { algorithms: ['HS256'] });`,
      },
    ],
    invalid: [
      {
        name: 'a createPublicKey destructured from require(node:crypto)',
        code: `${H}const { createPublicKey } = require('node:crypto');
jwt.verify(t, createPublicKey(pem), { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
      {
        name: 'a string-named import of createPublicKey',
        code: `${H}import { 'createPublicKey' as make } from 'node:crypto';
jwt.verify(t, make(pem), { algorithms: ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
    ],
  });

  ruleTester.run('static numbers', noTimestampManipulation, {
    valid: [
      {
        name: 'arithmetic nested deeper than the walk bound is not evaluated',
        code: `${H}jwt.verify(t, k, { clockTolerance: 1+(1+(1+(1+(1+(1+(1+(1+(1+(1+(1+999)))))))))) });`,
      },
      {
        name: 'a non-numeric literal is not a number of seconds',
        code: `${H}jwt.verify(t, k, { clockTolerance: true });`,
      },
    ],
    invalid: [
      {
        name: 'subtraction and division over literals are evaluated',
        code: `${H}jwt.verify(t, k, { clockTolerance: (7200 - 0) / 2 });`,
        errors: [{ messageId: 'excessiveClockTolerance' }],
      },
    ],
  });

  ruleTester.run('provenance bound', noDecodeWithoutVerify, {
    valid: [],
    invalid: [
      {
        name: 'a member chain deeper than the provenance bound proves nothing',
        code: `import { decodeJwt } from 'jose';
const claims = decodeJwt(x.a.b.c.d.e.f.g.h.i.j);
grant(claims.sub);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  });

  ruleTester.run('nested opaque spreads', noSensitivePayload, {
    valid: [],
    invalid: [
      {
        name: 'an opaque spread inside a resolved const is reported where it is written',
        code: `${H}export function issue(user) {
  const extra = { ...user, kind: 'u' };
  return jwt.sign({ ...extra }, key);
}`,
        errors: [{ messageId: 'wholeRecordSpread' }],
      },
    ],
  });
});
