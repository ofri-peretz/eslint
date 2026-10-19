/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureWebsocket } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-insecure-websocket (mutation edges)', noInsecureWebsocket, {
  valid: [
    {
      name: 'prose that mentions ws:// mid-string is not a URL',
      code: "const help = 'Connect via ws://chat.acme-corp.io';",
    },
  ],
  invalid: [],
});
