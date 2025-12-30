/**
 * Tests for no-postmessage-innerhtml rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPostmessageInnerhtml } from './index';
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

ruleTester.run('no-postmessage-innerhtml', noPostmessageInnerhtml, {
  valid: [
    // Safe: using textContent
    {
      code: `
        window.addEventListener('message', (event) => {
          element.textContent = event.data;
        });
      `,
    },
    // Safe: with origin check and sanitization
    {
      code: `
        window.addEventListener('message', (event) => {
          if (event.origin !== 'https://trusted.com') return;
          element.innerHTML = DOMPurify.sanitize(event.data);
        });
      `,
    },
    // Not a message handler
    {
      code: `
        window.addEventListener('click', (event) => {
          element.innerHTML = event.target.value;
        });
      `,
    },
    // innerHTML outside message handler
    {
      code: `
        element.innerHTML = userInput;
      `,
    },
    // Test files allowed by default
    {
      code: `
        window.addEventListener('message', (event) => {
          element.innerHTML = event.data;
        });
      `,
      filename: 'handler.test.ts',
    },
    // Using variable (not directly event.data)
    {
      code: `
        window.addEventListener('message', (event) => {
          const sanitized = DOMPurify.sanitize(event.data);
          element.innerHTML = sanitized;
        });
      `,
    },
  ],
  invalid: [
    // Direct innerHTML with event.data
    {
      code: `
        window.addEventListener('message', (event) => {
          element.innerHTML = event.data;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // outerHTML with event.data
    {
      code: `
        window.addEventListener('message', (event) => {
          container.outerHTML = event.data;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'outerHTML' } }],
    },
    // Nested property: event.data.content
    {
      code: `
        window.addEventListener('message', (event) => {
          element.innerHTML = event.data.content;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // insertAdjacentHTML with event.data
    {
      code: `
        window.addEventListener('message', (event) => {
          element.insertAdjacentHTML('beforeend', event.data);
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'insertAdjacentHTML' } }],
    },
    // document.write with event.data
    {
      code: `
        window.addEventListener('message', (event) => {
          document.write(event.data);
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'write' } }],
    },
    // Function expression instead of arrow
    {
      code: `
        window.addEventListener('message', function(evt) {
          element.innerHTML = evt.data;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Different event parameter name
    {
      code: `
        window.addEventListener('message', (e) => {
          container.innerHTML = e.data.html;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        window.addEventListener('message', (event) => {
          element.innerHTML = event.data;
        });
      `,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
  ],
});
