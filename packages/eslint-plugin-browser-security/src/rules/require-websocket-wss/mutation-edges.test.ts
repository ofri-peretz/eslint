/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireWebsocketWss } from './index';
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

ruleTester.run('require-websocket-wss (mutation edges)', requireWebsocketWss, {
  valid: [
    {
      name: 'a wss:// URL whose query names a ws:// fallback is secure',
      code: "new WebSocket('wss://chat.acme-corp.io/?fallback=ws://legacy.acme-corp.io')",
    },
  ],
  invalid: [
    {
      name: 'an escaped scheme gets no fix even when the query spells ws://',
      code: "new WebSocket('\\x77s://chat.acme-corp.io/?r=ws://x.acme-corp.io')",
      output: null,
      errors: [{ messageId: 'insecureWebsocket', suggestions: [] }],
    },
  ],
});
