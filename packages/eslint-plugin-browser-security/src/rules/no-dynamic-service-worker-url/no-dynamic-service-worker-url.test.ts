/**
 * Tests for no-dynamic-service-worker-url rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicServiceWorkerUrl } from './index';
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

ruleTester.run('no-dynamic-service-worker-url', noDynamicServiceWorkerUrl, {
  valid: [
    // Static URL is fine
    {
      code: `navigator.serviceWorker.register('/sw.js');`,
    },
    {
      code: `navigator.serviceWorker.register('/service-worker.js');`,
    },
    {
      code: `navigator.serviceWorker.register('./worker.js');`,
    },
    // Not a service worker registration
    {
      code: `someObject.register(dynamicUrl);`,
    },
    // Test files allowed
    {
      code: `navigator.serviceWorker.register(dynamicUrl);`,
      filename: 'sw.test.ts',
    },
  ],
  invalid: [
    // Variable URL
    {
      code: `navigator.serviceWorker.register(swUrl);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Expression URL
    {
      code: `navigator.serviceWorker.register(getSwUrl());`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Template literal
    {
      code: `navigator.serviceWorker.register(\`\${basePath}/sw.js\`);`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Concatenation
    {
      code: `navigator.serviceWorker.register(basePath + '/sw.js');`,
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
    // Test file with allowInTests: false
    {
      code: `navigator.serviceWorker.register(dynamicUrl);`,
      filename: 'sw.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'dynamicSwUrl' }],
    },
  ],
});
