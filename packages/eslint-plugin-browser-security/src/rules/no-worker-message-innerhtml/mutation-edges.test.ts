/**
 * Mutation-survivor kill fixtures for no-worker-message-innerhtml.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noWorkerMessageInnerhtml } from './index';
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

ruleTester.run('no-worker-message-innerhtml', noWorkerMessageInnerhtml, {
  valid: [
    {
      name: 'assigning the message to a plain variable is not a sink',
      code: "const w = new Worker('w.js'); w.onmessage = (e) => { let html; html = e.data; };",
    },
    {
      name: 'a static insertAdjacentHTML argument inside the worker handler is not the message',
      code: "const w = new Worker('w.js'); w.onmessage = (e) => { el.insertAdjacentHTML('beforeend', '<b>done</b>'); };",
    },
  ],
  invalid: [],
});
