/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireHttpsOnly } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-https-only (mutation edges)', requireHttpsOnly, {
  valid: [
    {
      name: 'http:// in the query of a relative fetch is not the request scheme',
      code: "fetch('/proxy?url=http://api.acme-corp.io/v1')",
    },
    {
      name: 'a call-built URL writes no prefix to judge',
      code: 'fetch(buildUrl(path))',
    },
    {
      name: 'a test file is skipped (skipTestFiles)',
      code: "fetch('http://api.acme-corp.io/v1')",
      filename: 'src/api.test.ts',
    },
  ],
  invalid: [],
});
