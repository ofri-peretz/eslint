/**
 * Tests for no-worker-message-innerhtml rule
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
    // Safe: textContent
    {
      name: 'the same data as textContent',
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (event) => {
          element.textContent = event.data;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        const myWorker = new Worker('worker.js');
        myWorker.onmessage = (e) => {
          const sanitized = DOMPurify.sanitize(e.data);
          element.innerHTML = sanitized;
        };
      `,
    },
    // Not a Worker handler
    // Test files allowed
    {
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
          element.innerHTML = e.data;
        };
      `,
      filename: 'worker.test.ts',
    },
  ],
  invalid: [
    {
      name: 'worker message data written to innerHTML',
      // Was `valid` — but `button` is constructed as a Worker, so this IS a
      // worker message handler. It only passed because the receiver's NAME
      // failed a heuristic, and with no-innerhtml now skipping the line as
      // ours, that made the finding disappear entirely.
      code: `
        const button = new Worker('worker.js');
        button.onmessage = (e) => {
          element.innerHTML = e.data;
        };
      `,
      errors: 1,
    },

    // innerHTML with event.data
    {
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // myWorker variable name
    {
      code: `
        const myWorker = new Worker('worker.js');
        myWorker.onmessage = (e) => {
          container.innerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // outerHTML
    {
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
          widget.outerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'outerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
          list.insertAdjacentHTML('beforeend', e.data);
        };
      `,
      errors: [
        {
          messageId: 'workerInnerhtml',
          data: { method: 'insertAdjacentHTML' },
        },
      ],
    },
    // addEventListener pattern
    {
      code: `
        const worker = new Worker('worker.js');
        worker.addEventListener('message', (e) => {
          element.innerHTML = e.data;
        });
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Function expression
    {
      code: `
        const sharedWorker = new Worker('worker.js');
        sharedWorker.onmessage = function(msg) {
          panel.innerHTML = msg.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
          element.innerHTML = e.data;
        };
      `,
      filename: 'worker.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
  ],
});
