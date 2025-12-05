/**
 * Comprehensive tests for no-insufficient-postmessage-validation rule
 * Security: CWE-20 (Improper Input Validation)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsufficientPostmessageValidation } from '../../rules/security/no-insufficient-postmessage-validation';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-insufficient-postmessage-validation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure postMessage usage', noInsufficientPostmessageValidation, {
      valid: [
        // Secure postMessage with specific origins
        {
          code: 'window.postMessage(data, "https://trusted-app.com");',
        },
        {
          code: 'parent.postMessage(result, "https://parent-domain.com");',
        },
        // Message handlers with origin validation
        {
          code: `
            window.addEventListener('message', (event) => {
              if (event.origin === 'https://trusted.com') {
                processData(event.data);
              }
            });
          `,
        },
        // Origin whitelist validation
        {
          code: `
            const allowedOrigins = ['https://app1.com', 'https://app2.com'];
            window.addEventListener('message', (event) => {
              if (allowedOrigins.includes(event.origin)) {
                handleMessage(event.data);
              }
            });
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Wildcard Origins', () => {
    ruleTester.run('invalid - wildcard postMessage origins', noInsufficientPostmessageValidation, {
      valid: [],
      invalid: [
        {
          code: 'window.postMessage(data, "*");',
          errors: [
            {
              messageId: 'wildcardOrigin',
            },
          ],
        },
        {
          code: 'parent.postMessage(result, "*");',
          errors: [
            {
              messageId: 'wildcardOrigin',
            },
          ],
        },
        {
          code: 'iframe.contentWindow.postMessage(data, "*");',
          errors: [
            {
              messageId: 'wildcardOrigin',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Origin Checks', () => {
    ruleTester.run('invalid - message handlers without origin validation', noInsufficientPostmessageValidation, {
      valid: [],
      invalid: [
        {
          code: `
            window.addEventListener('message', function(event) {
              processData(event.data);
            });
          `,
          errors: [
            {
              messageId: 'missingOriginCheck',
            },
          ],
        },
        {
          code: `
            window.onmessage = (event) => {
              handleMessage(event.data);
            };
          `,
          errors: [
            {
              messageId: 'missingOriginCheck',
            },
          ],
        },
      ],
    });
  });


  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noInsufficientPostmessageValidation, {
      valid: [
        // Validated message handlers with safe annotation
        {
          code: `
            /** @safe-message */
            window.addEventListener('message', (event) => {
              processData(event.data);
            });
          `,
        },
        // Development wildcard allowance
        {
          code: 'window.postMessage(data, "*");',
          options: [{ allowWildcardInDev: true }],
        },
        // Explicitly allowed origins including wildcard
        {
          code: 'window.postMessage(data, "*");',
          options: [{ allowedOrigins: ['*'] }],
        },
        // Safe origin validation patterns in handler
        {
          code: `
            window.addEventListener('message', (event) => {
              if (event.origin && event.origin.endsWith('.trusted.com')) {
                processData(event.data);
              }
            });
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - allowed origins', noInsufficientPostmessageValidation, {
      valid: [
        // Specific origin is always allowed (rule only flags wildcard)
        {
          code: 'window.postMessage(data, "https://allowed.com");',
        },
        // Non-allowed specific origin is still valid (rule focuses on wildcard)
        {
          code: 'window.postMessage(data, "https://not-allowed.com");',
        },
      ],
      invalid: [],
    });

    ruleTester.run('config - development wildcard', noInsufficientPostmessageValidation, {
      valid: [
        {
          code: 'window.postMessage(data, "*");',
          options: [{ allowWildcardInDev: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex PostMessage Scenarios', () => {
    ruleTester.run('complex - real-world postMessage patterns', noInsufficientPostmessageValidation, {
      valid: [],
      invalid: [
        // Cross-origin iframe communication vulnerability
        {
          code: `
            function sendToIframe(data) {
              const iframe = document.getElementById('external-iframe');
              iframe.contentWindow.postMessage(data, '*');
            }
          `,
          errors: [
            {
              messageId: 'wildcardOrigin',
            },
          ],
        },
        // Message handler without origin validation
        {
          code: `
            window.addEventListener('message', (event) => {
              if (event.data.type === 'update') {
                updateUserData(event.data.payload);
              }
            });
          `,
          errors: [
            {
              messageId: 'missingOriginCheck',
            },
          ],
        },
      ],
    });
  });
});
