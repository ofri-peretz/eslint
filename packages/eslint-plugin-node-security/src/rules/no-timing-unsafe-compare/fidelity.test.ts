/**
 * no-timing-unsafe-compare — the doc contradicted itself: Rule Details and the
 * ❌ examples (`userKey === storedKey`) said a secret-looking name alone
 * reports, while the options table said the default needs an
 * attacker-controlled operand (`reportUnverifiedComparisons: false`). The
 * Quint model (benchmarks/suites/fidelity/models/node-security/no_timing_unsafe_compare.qnt)
 * follows the options table; the doc's examples now do too, and these lock
 * every example the doc shows.
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

describe('no-timing-unsafe-compare fidelity', () => {
  ruleTester.run('the documented examples', noTimingUnsafeCompare, {
    valid: [
      {
        name: 'two secret-named values with no request operand are silent by default',
        code: `export function check(submittedToken: string, validToken: string) { return submittedToken === validToken; }`,
      },
    ],
    invalid: [
      {
        name: 'a request header compared to a stored API key is reported',
        code: `export function check(req: any) { return req.headers['x-api-key'] === process.env.API_SECRET; }`,
        errors: 1,
      },
      {
        name: 'a request token compared to a valid token is reported',
        code: `export function check(req: any, validToken: string) { if (req.body.token === validToken) { return true; } return false; }`,
        errors: 1,
      },
      {
        name: 'a request signature compared to an expected hash is reported',
        code: `import crypto from 'node:crypto';
export function verify(req: any, secret: string, data: string) {
  const expectedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return req.headers['x-signature'] === expectedHash;
}`,
        errors: 1,
      },
      {
        name: 'reportUnverifiedComparisons reports on the secret-looking names alone',
        code: `export function check(submittedToken: string, validToken: string) { return submittedToken === validToken; }`,
        options: [{ reportUnverifiedComparisons: true }],
        errors: 1,
      },
    ],
  });
});
