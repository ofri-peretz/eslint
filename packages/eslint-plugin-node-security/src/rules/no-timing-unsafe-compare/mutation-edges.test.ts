/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands. Cases marked `Rule fix` were wrong verdicts the survivors led to.
 *
 * The name-matching guards (constants, named constants, predicates,
 * self-comparisons) only decide a verdict once the untrusted-operand gate is
 * out of the way, so those run under `reportUnverifiedComparisons: true`; under
 * the default the gate alone keeps them quiet and proves nothing about the
 * guard.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const NAME_ONLY = [{ reportUnverifiedComparisons: true }];
const error = { messageId: 'timingUnsafeCompare' as const };

ruleTester.run(
  'mutation-guided edges: name-only contract',
  noTimingUnsafeCompare,
  {
    valid: [
      // Source constants
      {
        name: 'a secret compared against undefined is a presence check',
        code: 'if (apiToken === undefined) init();',
      },
      {
        name: 'a secret compared against an empty string literal is a presence check',
        code: "if (apiToken === '') init();",
      },
      {
        name: 'a secret compared against a template literal with no expressions is a constant',
        code: 'if (apiToken === ``) init();',
      },
      // Named constants: namespace-cased object AND constant-cased property
      {
        name: 'an enum member with an underscore name is a named constant',
        code: 'if (TokenType.REFRESH_TOKEN === type) ok();',
      },
      {
        name: 'a SCREAMING_SNAKE namespace holding a constant is a named constant',
        code: 'if (AUTH_HEADERS.API_KEY === headerName) ok();',
      },
      // Self-comparisons
      {
        name: 'a secret compared with a normalised copy of itself is a self-comparison',
        code: 'if (signature === signature.trim()) ok();',
      },
      {
        name: 'a self-comparison is recognised with the derived side on the left',
        code: 'if (signature.trim() === signature) ok();',
      },
      // Non-secret names
      {
        name: 'location.hash is a URL fragment, not a digest',
        code: 'if (location.hash === target) ok();',
      },
      {
        name: 'boolean predicates named after tokens are not secrets',
        code: 'if (isTokenExpired === shouldRefresh) ok();',
      },
      {
        name: 'a non-equality binary operator on a secret is not a comparison',
        code: 'const combined = apiToken + nonce;',
      },
      // (These used to run under the DEFAULT options — the `.map` below only
      // covered `invalid` — where the untrusted-operand gate alone keeps every
      // one of them quiet. They are now held to the name-only contract their
      // header names.)
    ].map((testCase) => ({ ...testCase, options: NAME_ONLY })),
    invalid: [
      {
        name: 'a template literal with an expression is not a constant',
        code: 'if (apiToken === `${prefix}abc`) init();',
        errors: [error],
      },
      {
        name: 'a secret name containing "is" before a capital (redisPassword) is not a predicate',
        code: 'if (redisPassword === provided) ok();',
        errors: [error],
      },
      {
        name: 'a camelCase property ending in a version suffix is not a named constant',
        code: 'if (Secrets.apiKeyV2 === provided) ok();',
        errors: [error],
      },
      {
        name: 'a PascalCase property is not a constant-cased name',
        code: 'if (Secrets.ApiKey === provided) ok();',
        errors: [error],
      },
      {
        name: 'a camelCase object is not a namespace even when its tail is capitalised',
        code: 'if (appConfig.API_KEY === provided) ok();',
        errors: [error],
      },
    ].map((testCase) => ({ ...testCase, options: NAME_ONLY })),
  },
);

ruleTester.run(
  'mutation-guided edges: default contract',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'an ordinary method result compared with a request id is not a secret',
        code: 'if (user.getId() === req.params.id) ok();',
      },
      {
        name: 'a concatenation with no crypto call is not a derived secret',
        code: "const expectedId = 'user:' + id;\nif (expectedId === req.params.id) ok();",
      },
      {
        name: 'two request-supplied values (double-submit cookie) have no server secret to leak',
        code: "if (req.body.token === req.get('x-csrf-token')) ok();",
      },
      {
        name: 'two server-side values with no attacker operand are not reported',
        code: 'async function f() { const key = await getKey(); if (key === apiKey) ok(); }',
      },
    ],
    invalid: [
      {
        name: 'an HMAC digest behind a type assertion is still a derived secret',
        code: "if ((crypto.createHmac('sha256', key).update(body).digest('hex') as string) === req.query.s) ok();",
        errors: [error],
      },
      {
        name: 'an HMAC digest chain is a derived secret through its createHmac call',
        code: "if (crypto.createHmac('sha256', key).update(body).digest('hex') === req.query.s) ok();",
        errors: [error],
      },
      {
        name: 'one crypto call among several template expressions makes the binding a derived secret',
        code: "const expected = `${algo}=${crypto.createHmac('sha256', key).update(body).digest('hex')}`;\nif (expected === req.query.s) ok();",
        errors: [error],
      },
      {
        name: 'session state behind a type assertion is server-derived',
        code: 'if (req.body.token === (req.session.csrfToken as string)) ok();',
        errors: [error],
      },
      {
        name: 'a local wrapper comparing its parameters with == is an equality wrapper',
        code: 'function same(a, b) { return a == b; }\nif (same(req.query.token, apiToken)) ok();',
        errors: [error],
      },
      {
        name: 'a local wrapper comparing its parameters with != is an equality wrapper',
        code: 'function differs(a, b) { return a != b; }\nif (differs(req.query.token, apiToken)) deny();',
        errors: [error],
      },
      {
        name: 'a wrapper whose first comparison is a presence check is judged by its parameter-to-parameter compare',
        code: `function tokensMatch(provided, expected) {
  if (provided === undefined) return false;
  return provided === expected;
}
if (tokensMatch(req.query.t, apiToken)) ok();`,
        errors: [error],
      },
      // Rule fix (FN): a `#private` field name was read as no name at all, so
      // `this.#apiToken` escaped the secret-name match `this.apiToken` hits.
      {
        name: 'a private field named like a secret compared with request input is reported',
        code: 'class Gate { #apiToken; check(req) { return this.#apiToken === req.query.t; } }',
        errors: [error],
      },
    ],
  },
);

ruleTester.run(
  'mutation-guided edges, batch 5: name-only contract',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'a secret compared with itself (the NaN idiom) is one value',
        code: 'if (apiToken !== apiToken) reset();',
      },
    ].map((testCase) => ({ ...testCase, options: NAME_ONLY })),
    invalid: [
      {
        name: 'a namespace-looking object with a lower-case tail after an underscore is not a namespace',
        code: 'if (Vault_prod.API_KEY === provided) ok();',
        errors: [error],
      },
    ].map((testCase) => ({ ...testCase, options: NAME_ONLY })),
  },
);

ruleTester.run(
  'mutation-guided edges, batch 5: default contract',
  noTimingUnsafeCompare,
  {
    valid: [
      {
        name: 'a request secret compared against a string literal is a tag check',
        code: "if (req.body.token === 'access') ok();",
      },
      {
        name: 'a request secret compared against an enum member is a tag check',
        code: 'if (req.body.tokenType === TokenType.REFRESH_TOKEN) ok();',
      },
      {
        name: 'a call returned by a call is not a crypto derivation',
        code: 'if (lookup(table)(row) === req.params.id) ok();',
      },
      {
        name: "a wrapper comparing one parameter's length against another is a length check",
        code: `function hasLength(value, n) { return value.length === n; }
if (hasLength(req.query.token, size)) ok();`,
      },
      {
        name: 'a cyclic alias chain through a request read terminates',
        code: `function f(req) {
  const a = b.x;
  const b = a.y.concat(req.body);
  if (req.body.token === a.token) ok();
}`,
      },
    ],
    invalid: [
      {
        name: 'a curried call beside a secret does not hide the secret',
        code: 'if (apiToken === lookup(table)(req.query.t)) ok();',
        errors: [error],
      },
      {
        name: 'BUG: a private method named like a crypto derivation derives a secret',
        code: `class Webhook {
  #hmac(body) { return compute(body); }
  verify(req) { return this.#hmac(req.rawBody) === req.headers['x-sig']; }
}`,
        errors: [error],
      },
      {
        name: 'BUG: server session state five hops up an alias chain is server-derived',
        code: `export function check(req) {
  const store = req.session;
  const csrf = store.csrf;
  if (req.body.token !== csrf.current.secret) deny();
}`,
        errors: [error],
      },
      {
        name: 'BUG: isEqualWith takes its customizer third and still compares the first two',
        code: 'if (_.isEqualWith(req.body.token, apiToken, compareLoosely)) ok();',
        errors: [error],
      },
      {
        name: 'BUG: deepEqual with an options bag still compares the first two',
        code: 'if (deepEqual(req.body.token, apiToken, { strict: true })) ok();',
        errors: [error],
      },
      {
        name: 'a wrapper is judged by its parameter-to-parameter compare, not by its first match only',
        code: `function verify(provided, expected, fallback) {
  if (provided === expected) return true;
  return expected === fallback;
}
if (verify(req.query.token, apiToken, DEFAULT_TOKEN)) ok();`,
        errors: [error],
      },
      {
        name: 'a hole in a destructuring pattern inside a wrapper is skipped',
        code: `function tokensMatch(header, expected) {
  const [, rest] = header.split(' ');
  if (rest === undefined) return false;
  return header === expected;
}
if (tokensMatch(req.headers.authorization, apiToken)) ok();`,
        errors: [error],
      },
      {
        name: 'a Yoda presence check inside a wrapper is not its comparison',
        code: `function tokensMatch(provided, expected) {
  if (null == provided) return false;
  return provided === expected;
}
if (tokensMatch(req.query.token, apiToken)) ok();`,
        errors: [error],
      },
      {
        name: 'a format check of one parameter against itself inside a wrapper is not its comparison',
        code: `function tokensMatch(provided, expected) {
  if (provided.trim() !== provided) return false;
  return provided === expected;
}
if (tokensMatch(req.query.token, apiToken)) ok();`,
        errors: [error],
      },
    ],
  },
);
