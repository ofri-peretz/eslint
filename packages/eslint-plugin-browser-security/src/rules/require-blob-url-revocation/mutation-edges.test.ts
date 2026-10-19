/**
 * Mutation-survivor kill fixtures for require-blob-url-revocation.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireBlobUrlRevocation } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-blob-url-revocation', requireBlobUrlRevocation, {
  valid: [
    // ── escapes: every hand-off position the caller owns ───────────────────
    {
      name: 'an expression-bodied arrow returns the handle to its caller',
      code: 'const make = (blob) => URL.createObjectURL(blob);',
    },
    {
      name: 'a handle passed straight to another call is handed out',
      code: 'new Promise((resolve) => resolve(URL.createObjectURL(blob)));',
    },
    {
      name: 'a handle placed in an object literal property is handed out',
      code: 'const entry = { src: URL.createObjectURL(blob) };',
    },
    {
      name: 'a handle placed in an array literal is handed out',
      code: 'const urls = [URL.createObjectURL(blob)];',
    },
  ],
  invalid: [
    {
      name: 'a handle parked on this.<field> and never revoked is a leak',
      code: 'class P { show(b) { this.previewUrl = URL.createObjectURL(b); } }',
      errors: [{ messageId: 'missingRevoke' }],
    },
    {
      name: 'two outer-scope handles assigned in a function stay distinct — revoking one does not release the other',
      code: 'let a, b; function f(x) { a = URL.createObjectURL(x); b = URL.createObjectURL(x); } function g() { URL.revokeObjectURL(a); }',
      errors: [{ messageId: 'missingRevoke', column: 55 }],
    },
    {
      name: 'a destructured creation is untrackable and reported at the call itself',
      code: 'const { length } = URL.createObjectURL(blob);',
      errors: [{ messageId: 'missingRevoke', column: 20 }],
    },
  ],
});
