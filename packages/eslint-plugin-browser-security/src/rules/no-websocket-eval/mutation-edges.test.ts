/**
 * Mutation-survivor kill fixtures for no-websocket-eval.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noWebsocketEval } from './index';
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

ruleTester.run('no-websocket-eval', noWebsocketEval, {
  valid: [],
  invalid: [
    {
      name: 'new Function reports when ANY code argument is the message, not only when all are',
      code: "const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { new Function('arg', e.data); };",
      errors: [{ messageId: 'evalWithWsData' }],
    },
  ],
});
