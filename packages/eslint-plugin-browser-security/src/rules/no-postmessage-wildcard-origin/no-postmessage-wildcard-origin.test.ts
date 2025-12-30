/**
 * Tests for no-postmessage-wildcard-origin rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPostmessageWildcardOrigin } from './index';
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

ruleTester.run('no-postmessage-wildcard-origin', noPostmessageWildcardOrigin, {
  valid: [
    // Correct usage: specific origin
    {
      code: `window.postMessage(data, 'https://example.com');`,
    },
    {
      code: `iframe.contentWindow.postMessage(data, 'https://trusted-domain.com');`,
    },
    // Using variable for origin (we can't statically analyze this)
    {
      code: `window.postMessage(data, targetOrigin);`,
    },
    // Options object with specific origin
    {
      code: `window.postMessage(data, { targetOrigin: 'https://example.com' });`,
    },
    // No origin argument (will fail at runtime but not our concern)
    {
      code: `window.postMessage(data);`,
    },
    // Test files are allowed by default
    {
      code: `window.postMessage(data, '*');`,
      filename: 'test.spec.ts',
    },
    {
      code: `window.postMessage(data, '*');`,
      filename: 'component.test.js',
    },
    // Non-postMessage method with wildcard (false positive check)
    {
      code: `myObject.someMethod(data, '*');`,
    },
    // Using "/" for same-origin (allowed)
    {
      code: `window.postMessage(data, '/');`,
    },
  ],
  invalid: [
    // Basic wildcard usage
    {
      code: `window.postMessage(data, '*');`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `window.postMessage(data, 'https://your-domain.com');` }],
        },
      ],
    },
    // Wildcard with iframe
    {
      code: `iframe.contentWindow.postMessage(message, '*');`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `iframe.contentWindow.postMessage(message, 'https://your-domain.com');` }],
        },
      ],
    },
    // Wildcard with parent window
    {
      code: `parent.postMessage({ type: 'ready' }, '*');`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `parent.postMessage({ type: 'ready' }, 'https://your-domain.com');` }],
        },
      ],
    },
    // Wildcard with opener
    {
      code: `window.opener.postMessage(result, '*');`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `window.opener.postMessage(result, 'https://your-domain.com');` }],
        },
      ],
    },
    // Options object with wildcard targetOrigin
    {
      code: `window.postMessage(data, { targetOrigin: '*' });`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `window.postMessage(data, { targetOrigin: 'https://your-domain.com' });` }],
        },
      ],
    },
    // With transfer array
    {
      code: `worker.postMessage(data, '*', [transferable]);`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `worker.postMessage(data, 'https://your-domain.com', [transferable]);` }],
        },
      ],
    },
    // Test file with allowInTests: false
    {
      code: `window.postMessage(data, '*');`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `window.postMessage(data, 'https://your-domain.com');` }],
        },
      ],
    },
    // Complex expression as receiver
    {
      code: `getIframe().contentWindow.postMessage(data, '*');`,
      errors: [
        {
          messageId: 'wildcardOrigin',
          suggestions: [{ messageId: 'specifyOrigin', output: `getIframe().contentWindow.postMessage(data, 'https://your-domain.com');` }],
        },
      ],
    },
  ],
});
