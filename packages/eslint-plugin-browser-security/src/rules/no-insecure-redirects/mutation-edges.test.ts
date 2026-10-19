/**
 * Mutation-survivor kill fixtures for no-insecure-redirects.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRedirects } from './index';

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

ruleTester.run('no-insecure-redirects mutation edges', noInsecureRedirects, {
  valid: [
    {
      name: 'a redirect call with no argument has no target to taint',
      code: 'res.redirect();',
    },
    {
      name: 'a location.replace call with no argument has no target to taint',
      code: 'window.location.replace();',
    },
  ],
  invalid: [],
});
