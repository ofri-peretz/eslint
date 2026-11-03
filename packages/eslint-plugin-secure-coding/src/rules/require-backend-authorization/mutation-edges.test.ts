/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireBackendAuthorization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-backend-authorization (mutation edges)', () => {
  ruleTester.run('require-backend-authorization', requireBackendAuthorization, {
    valid: [
      {
        name: 'an express import marks the file as server code',
        code: "import express from 'express'; if (user.role === 'admin') { document.title = 'x'; }",
      },
      {
        name: 'a ternary on a claim is a rendering choice, not a guarded branch',
        code: "const label = user.role === 'admin' ? 'A' : 'B'; document.title = label;",
      },
      {
        name: 'an ordinary expression statement is not a use client directive',
        code: "foo(); if (user.role === 'admin') { grant(); }",
      },
    ],
    invalid: [],
  });
});
