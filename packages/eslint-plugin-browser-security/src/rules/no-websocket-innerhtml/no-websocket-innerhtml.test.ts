/**
 * Tests for no-websocket-innerhtml rule
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
    // Safe: using textContent
    {
      code: `
        ws.onmessage = (event) => {
          element.textContent = event.data;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        ws.onmessage = (event) => {
          element.innerHTML = DOMPurify.sanitize(event.data);
        };
      `,
    },
    // Safe: using variable (not direct event.data)
    {
      code: `
        ws.onmessage = (event) => {
          const sanitized = DOMPurify.sanitize(event.data);
          element.innerHTML = sanitized;
        };
      `,
    },
    // Not a WebSocket handler
    {
      code: `
        button.onclick = (event) => {
          element.innerHTML = event.target.value;
        };
      `,
    },
    // innerHTML outside handler
    {
      code: `
        element.innerHTML = serverData;
      `,
    },
    // Test files allowed by default
    {
      code: `
        ws.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      filename: 'socket.test.ts',
    },
    // addEventListener for non-message events
    {
      code: `
        ws.addEventListener('open', (event) => {
          element.innerHTML = event.data;
        });
      `,
    },
  ],
  invalid: [
    // onmessage with innerHTML
    {
      code: `
        ws.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // onmessage with outerHTML
    {
      code: `
        socket.onmessage = (e) => {
          container.outerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'outerHTML' } }],
    },
    // addEventListener with innerHTML
    {
      code: `
        ws.addEventListener('message', (event) => {
          chatBox.innerHTML = event.data;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Nested data property
    {
      code: `
        ws.onmessage = (event) => {
          element.innerHTML = event.data.content;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        ws.onmessage = (event) => {
          list.insertAdjacentHTML('beforeend', event.data);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'insertAdjacentHTML' } }],
    },
    // document.write (though rarely used with WS)
    {
      code: `
        ws.onmessage = (event) => {
          document.write(event.data);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'write' } }],
    },
    // Function expression
    {
      code: `
        websocket.onmessage = function(msg) {
          panel.innerHTML = msg.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        ws.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      filename: 'socket.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
  ],
});
