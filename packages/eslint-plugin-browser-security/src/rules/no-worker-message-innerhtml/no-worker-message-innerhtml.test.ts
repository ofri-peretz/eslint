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
      code: `
        worker.onmessage = (event) => {
          element.textContent = event.data;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        myWorker.onmessage = (e) => {
          const sanitized = DOMPurify.sanitize(e.data);
          element.innerHTML = sanitized;
        };
      `,
    },
    // Not a Worker handler
    {
      code: `
        button.onmessage = (e) => {
          element.innerHTML = e.data;
        };
      `,
    },
    // Test files allowed
    {
      code: `
        worker.onmessage = (e) => {
          element.innerHTML = e.data;
        };
      `,
      filename: 'worker.test.ts',
    },
  ],
  invalid: [
    // innerHTML with event.data
    {
      code: `
        worker.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // myWorker variable name
    {
      code: `
        myWorker.onmessage = (e) => {
          container.innerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // outerHTML
    {
      code: `
        worker.onmessage = (e) => {
          widget.outerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'outerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        worker.onmessage = (e) => {
          list.insertAdjacentHTML('beforeend', e.data);
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'insertAdjacentHTML' } }],
    },
    // addEventListener pattern
    {
      code: `
        worker.addEventListener('message', (e) => {
          element.innerHTML = e.data;
        });
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Function expression
    {
      code: `
        sharedWorker.onmessage = function(msg) {
          panel.innerHTML = msg.data;
        };
      `,
      errors: [{ messageId: 'workerInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
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
