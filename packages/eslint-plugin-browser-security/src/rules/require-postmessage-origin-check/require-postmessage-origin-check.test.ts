/**
 * Tests for require-postmessage-origin-check rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requirePostmessageOriginCheck } from './index';
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

ruleTester.run(
  'require-postmessage-origin-check',
  requirePostmessageOriginCheck,
  {
    valid: [
      // Has origin check with strict equality
      {
        code: `
        window.addEventListener('message', (event) => {
          if (event.origin !== 'https://trusted.com') return;
          handleMessage(event.data);
        });
      `,
      },
      // Has origin check with loose equality
      {
        code: `
        window.addEventListener('message', (e) => {
          if (e.origin != 'https://example.com') return;
          processData(e.data);
        });
      `,
      },
      // Uses allowedOrigins array check
      {
        code: `
        window.addEventListener('message', (event) => {
          if (!allowedOrigins.includes(event.origin)) return;
          doSomething(event.data);
        });
      `,
      },
      // Uses custom validation function
      {
        code: `
        window.addEventListener('message', (event) => {
          if (!isAllowedOrigin(event.origin)) return;
          processMessage(event.data);
        });
      `,
      },
      // Function reference (can't analyze, so we allow)
      {
        code: `
        window.addEventListener('message', messageHandler);
      `,
      },
      // Test file with allowInTests
      {
        code: `
        window.addEventListener('message', (event) => {
          handleMessage(event.data);
        });
      `,
        options: [{ allowInTests: true }],
        filename: 'app.test.ts',
      },
      // Not a message event
      {
        code: `
        window.addEventListener('click', (event) => {
          handleClick(event);
        });
      `,
      },
    ],
    invalid: [
      // No origin check
      {
        code: `
        window.addEventListener('message', (event) => {
          handleMessage(event.data);
        });
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
      // Arrow function without origin check
      {
        code: `
        addEventListener('message', (e) => processData(e.data));
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
      // Function expression without origin check
      {
        code: `
        window.addEventListener('message', function(event) {
          document.body.innerHTML = event.data;
        });
      `,
        errors: [
          {
            messageId: 'missingOriginCheck',
          },
        ],
      },
    ],
  },
);
