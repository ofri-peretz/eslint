/**
 * Tests for no-websocket-eval rule
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
  valid: [
    // Safe: JSON.parse usage
    {
      code: `
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleData(data);
        };
      `,
    },
    // Safe: textContent
    {
      code: `
        ws.onmessage = (event) => {
          element.textContent = event.data;
        };
      `,
    },
    // Not a WebSocket handler
    {
      code: `
        button.onclick = (event) => {
          eval(event.target.value);
        };
      `,
    },
    // eval outside handler
    {
      code: `
        eval(code);
      `,
    },
    // Test files allowed by default
    {
      code: `
        ws.onmessage = (event) => {
          eval(event.data);
        };
      `,
      filename: 'socket.test.ts',
    },
    // eval with non-event.data argument
    {
      code: `
        ws.onmessage = (event) => {
          eval(someOtherCode);
        };
      `,
    },
  ],
  invalid: [
    // eval with event.data
    {
      code: `
        ws.onmessage = (event) => {
          eval(event.data);
        };
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'eval' } }],
    },
    // new Function with event.data
    {
      code: `
        ws.onmessage = (event) => {
          const fn = new Function(event.data);
          fn();
        };
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'new Function' } }],
    },
    // Function() constructor (without new)
    {
      code: `
        ws.onmessage = (event) => {
          const fn = Function(event.data);
          fn();
        };
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'Function' } }],
    },
    // addEventListener pattern
    {
      code: `
        socket.addEventListener('message', (event) => {
          eval(event.data);
        });
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'eval' } }],
    },
    // Nested property
    {
      code: `
        ws.onmessage = (event) => {
          eval(event.data.code);
        };
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'eval' } }],
    },
    // Function expression
    {
      code: `
        websocket.onmessage = function(msg) {
          eval(msg.data);
        };
      `,
      errors: [{ messageId: 'evalWithWsData', data: { method: 'eval' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        ws.onmessage = (event) => {
          eval(event.data);
        };
      `,
      filename: 'socket.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'evalWithWsData', data: { method: 'eval' } }],
    },
  ],
});
