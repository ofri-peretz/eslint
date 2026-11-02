/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FP:` case is a wrong verdict the triage found: it fails on the rule as it
 * was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noMissingCsrfProtection } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const EXPRESS = "const express = require('express'); const app = express();";

ruleTester.run(
  'no-missing-csrf-protection — mutation edges',
  noMissingCsrfProtection,
  {
    valid: [
      // @found Stryker mutation-survivor triage, 2026-11-02: a four-hop
      // budget on the alias walk reported a route whose verifier sat five
      // plain aliases away; an existing invalid case pinned it.
      {
        name: 'FP: a verifier reached through five aliases still protects the route',
        code: `${EXPRESS} const a = verifyCsrfToken; const b = a; const c = b; const d = c; const e = d; app.use(e); app.post('/x', h);`,
      },
      {
        name: 'an array of middleware holding csrf protects the route',
        code: `${EXPRESS} app.post('/transfer', [csrfProtection, handler]);`,
      },
      {
        name: 'a global mount of several middleware including csrf protects every route',
        code: `${EXPRESS} app.use(express.json(), csrfProtection); app.post('/transfer', handler);`,
      },
      {
        name: 'a verb on a free function call result is not a route chain',
        code: `${EXPRESS} getClient().post('/orders', cart);`,
      },
      {
        name: 'a verb chained off app.use() without a path is not a .route chain',
        code: `${EXPRESS} app.use(cors()).post(handler);`,
      },
    ],
    invalid: [
      {
        name: 'a cyclic alias of the middleware resolves to nothing and terminates',
        code: `${EXPRESS} const a = b; const b = a; app.use(a); app.post('/x', h);`,
        errors: 1,
      },
      {
        name: 'csrf middleware on another route does not protect this one',
        code: `${EXPRESS} app.get('/form', csrfProtection, renderForm); app.post('/transfer', handler);`,
        errors: 1,
      },
      {
        name: 'a top-level assignment is not a middleware mount',
        code: `${EXPRESS} app.locals.title = 'Bank'; app.post('/transfer', handler);`,
        errors: 1,
      },
      {
        name: 'a top-level call of a free function is not a middleware mount',
        code: `${EXPRESS} configure(csrfProtection); app.post('/transfer', handler);`,
        errors: 1,
      },
      {
        name: 'a sparse middleware array is read without crashing',
        code: `${EXPRESS} app.post('/transfer', [, handler]);`,
        errors: 1,
      },
    ],
  },
);
