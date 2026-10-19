/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noFailOpenAuth } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const swallow = [{ messageId: 'failOpenSwallow' as const }];

describe('no-fail-open-auth (mutation edges)', () => {
  ruleTester.run('no-fail-open-auth', noFailOpenAuth, {
    valid: [
      {
        name: 'a test file is skipped',
        filename: 'src/auth.test.ts',
        code: 'async function f(t) { try { await verifyToken(t); } catch (e) {} await purge(); }',
      },
      {
        name: 'res.status(400) — the bottom of the 4xx range — is a denial',
        code: 'async function f(req, res) { try { await verifyToken(req.t); } catch (e) { res.status(400); } await purge(); }',
      },
      {
        name: 'a guard that throws on the deny state leaves the function',
        code: "async function f(req) { let token = null; try { token = await verifyToken(req.t); } catch (e) {} if (!token) { throw new Error('denied'); } await purge(); }",
      },
    ],
    invalid: [
      {
        name: 'a call whose name only starts with a denial word does not deny',
        code: 'async function f(t) { try { await verifyToken(t); } catch (e) { nextAttempt(); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'a call whose name only ends with a denial word does not deny',
        code: 'async function f(t) { try { await verifyToken(t); } catch (e) { metrics.countFail(); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'a throw inside the try block does not close the catch',
        code: "async function f(t) { try { const ok = await verifyToken(t); if (!ok) throw new Error('x'); } catch (e) {} await purge(); }",
        errors: swallow,
      },
      {
        name: 'a 4xx number passed to a call that is not status() is not a denial',
        code: 'async function f(t) { try { await verifyToken(t); } catch (e) { metrics.increment(401); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'status() with no argument is not a denial',
        code: 'async function f(req, res) { try { await verifyToken(req.t); } catch (e) { res.status(); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'one write to anything but a deny-state local keeps the swallow reported',
        code: 'async function f(req) { let token = null; try { token = await verifyToken(req.t); req.user = token; } catch (e) {} if (!token) { return deny(); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'an uninitialised let is not recognised as a deny state (see owner decisions)',
        code: 'async function f(req) { let token; try { token = await verifyToken(req.t); } catch (e) {} if (!token) { return deny(); } await purge(); }',
        errors: swallow,
      },
      {
        name: 'a return inside a nested function declaration does not leave the guard',
        code: 'async function f(req) { let token = null; try { token = await verifyToken(req.t); } catch (e) {} if (token) { function inner() { return 1; } } await purge(); }',
        errors: swallow,
      },
      {
        name: 'a return inside a nested function expression does not leave the guard',
        code: 'async function f(req) { let token = null; try { token = await verifyToken(req.t); } catch (e) {} if (token) { xs.map(function (x) { return x; }); } await purge(); }',
        errors: swallow,
      },
    ],
  });
});
