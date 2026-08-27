/**
 * @fileoverview Tests for require-data-minimization
 *
 * This rule hard-coded `['email', 'name', 'phone', 'address']` and a threshold
 * of ten until 2026-08-26. Nobody defines those names. `innerHTML` is
 * `innerHTML` because WHATWG says so; which fields in a project's schema are
 * personal is a fact about that project, and a rule cannot read it off the AST.
 *
 * Both are now the consumer's, and the vocabulary REPLACES rather than adds —
 * a default that cannot be removed is still an assertion about somebody else's
 * schema.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireDataMinimization } from '../../rules/operability/require-data-minimization';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

/** What the old hard-coded list contained, now supplied by the caller. */
const PII = [{ piiFields: ['email', 'name', 'phone', 'address'] }] as const;
const WIDE = 'const x = { email: e, name: n, age: a, city: c, zip: z, phone: p, address: ad, country: co, state: s, company: cp, job: j }';

ruleTester.run('require-data-minimization', requireDataMinimization, {
  valid: [
    {
      // The headline behaviour change. With nothing named as personal there is
      // nothing to be excessive ABOUT, so the rule declines rather than
      // guessing which of these eleven fields is sensitive.
      name: 'unconfigured, the rule is inert on the very object it used to report',
      code: WIDE,
    },
    {
      name: 'a vocabulary that does not match this schema stays quiet',
      code: WIDE,
      options: [{ piiFields: ['ssn', 'passportNumber'] }],
    },
    {
      name: 'personal fields, but within the threshold',
      code: "const user = { name: 'John', email: 'john@example.com' }",
      options: [...PII],
    },
    {
      name: 'breadth without any personal field',
      code: 'const config = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }',
      options: [...PII],
    },
    {
      // The threshold is arguable, so it is a knob rather than a constant.
      name: 'a project that raises the threshold above its widest row',
      code: WIDE,
      options: [{ piiFields: ['email', 'name'], maxProperties: 50 }],
    },
    {
      // A spread is not a Property, so it carries no key to judge.
      name: 'a spread element among the properties',
      code: 'const x = { ...base, a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }',
      options: [...PII],
    },
    {
      name: 'a computed key that is not statically knowable',
      code: 'const x = { [k]: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }',
      options: [...PII],
    },
  ],

  invalid: [
    {
      name: 'eleven fields including ones this project calls personal',
      code: WIDE,
      options: [...PII],
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'the same breadth assembled with shorthand properties',
      code: 'const profile = { email, name, age, city, zip, phone, address, country, state, company, job }',
      options: [...PII],
      errors: 1,
    },
    {
      name: 'the same breadth returned directly from a handler',
      code: 'function toDto(u) { return { email: u.e, name: u.n, age: u.a, city: u.c, zip: u.z, phone: u.p, address: u.ad, country: u.co, state: u.s, company: u.cp, job: u.j }; }',
      options: [...PII],
      errors: 1,
    },
    {
      // A project whose fields are spelled its own way is now reachable, which
      // is the entire point of the option.
      name: 'a schema whose personal fields the old hard-coded list never knew',
      code: 'const row = { emailAddress: e, mobile: m, billingLine1: b, a: 1, b2: 2, c: 3, d: 4, f: 5, g: 6, h: 7, i: 8 }',
      options: [{ piiFields: ['emailAddress', 'mobile', 'billingLine1'] }],
      errors: 1,
    },
    {
      // `objectKeyName`, not `key.name`: the computed spelling declares the
      // same property.
      name: 'a personal field declared through a computed literal key',
      code: "const x = { ['email']: e, b: 2, c: 3, d: 4, e2: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 }",
      options: [...PII],
      errors: 1,
    },
    {
      name: 'a lowered threshold reports a narrower object',
      code: "const u = { email: e, name: n, age: a }",
      options: [{ piiFields: ['email'], maxProperties: 2 }],
      errors: 1,
    },
  ],
});
