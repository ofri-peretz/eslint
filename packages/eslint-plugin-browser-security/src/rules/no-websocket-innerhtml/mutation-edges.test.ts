/**
 * Mutation-survivor kill fixtures for no-websocket-innerhtml.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noWebsocketInnerhtml } from './index';
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

ruleTester.run('no-websocket-innerhtml', noWebsocketInnerhtml, {
  valid: [
    {
      name: 'assigning the message to a plain variable is not a sink',
      code: "const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { let html; html = e.data; };",
    },
    {
      name: 'a static insertAdjacentHTML argument inside the WebSocket handler is not the message',
      code: "const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { el.insertAdjacentHTML('beforeend', '<b>done</b>'); };",
    },
  ],
  invalid: [],
});
