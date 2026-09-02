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
    // A sink chosen at RUNTIME names neither a property nor a method we
    // can recognise — unlike `el['innerHTML']`, there is nothing to read.
    {
      name: 'a runtime-keyed sink names nothing',
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.addEventListener('message', (e) => {
          element[sink] = e.data;
          element[write](e.data);
        });
      `,
    },
    // Safe: using textContent
    {
      name: 'the same data as textContent',
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          element.textContent = event.data;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          element.innerHTML = DOMPurify.sanitize(event.data);
        };
      `,
    },
    // Safe: using variable (not direct event.data)
    {
      code: `
        const ws = new WebSocket('wss://example.test');
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
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      filename: 'socket.test.ts',
    },
    // addEventListener for non-message events
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.addEventListener('open', (event) => {
          element.innerHTML = event.data;
        });
      `,
    },
  ],
  invalid: [
    {
      name: 'WebSocket data reaching innerHTML through a worker hop',
      // A NESTED handler used to clear the outer handler's mutable flag, so
      // the WebSocket sink after it went unreported here while no-innerhtml
      // skipped it as ours — the finding belonged to nobody. Only the
      // WebSocket sink is this rule's; the Worker one belongs to
      // no-worker-message-innerhtml.
      code: `
        const ws = new WebSocket('wss://example.test');
        const worker = new Worker('worker.js');
        ws.onmessage = (event) => {
          worker.onmessage = (we) => { element.innerHTML = we.data; };
          element.innerHTML = event.data;
        };
      `,
      errors: 1,
    },

    // onmessage with innerHTML
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          element.innerHTML = event.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // onmessage with outerHTML
    {
      code: `
        const socket = new WebSocket('wss://example.test');
        socket.onmessage = (e) => {
          container.outerHTML = e.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'outerHTML' } }],
    },
    // addEventListener with innerHTML
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.addEventListener('message', (event) => {
          chatBox.innerHTML = event.data;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Nested data property
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          element.innerHTML = event.data.content;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          list.insertAdjacentHTML('beforeend', event.data);
        };
      `,
      errors: [
        {
          messageId: 'unsafeInnerhtml',
          data: { method: 'insertAdjacentHTML' },
        },
      ],
    },
    // document.write (though rarely used with WS)
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => {
          document.write(event.data);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'write' } }],
    },
    // Function expression
    {
      code: `
        const websocket = new WebSocket('wss://example.test');
        websocket.onmessage = function(msg) {
          panel.innerHTML = msg.data;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        const ws = new WebSocket('wss://example.test');
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
