/**
 * @fileoverview Tests for no-test-retry
 *
 * A retry is reported in test options, config factories and runner config
 * files. A `retry` key anywhere else (an HTTP client's options) is not a test
 * retry; `retry: 0` is the absence of one; a comment citing a decision or an
 * issue makes it legal.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noTestRetry } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-test-retry', noTestRetry, {
  valid: [
    {
      name: 'an HTTP client retry is not a test retry',
      code: `const client = got.extend({ retry: { limit: 2 } });`,
    },
    {
      name: 'a retry key in a plain object',
      code: `const opts = { retries: 3 };`,
    },
    {
      name: 'retry: 0 in a test',
      code: `it('x', { retry: 0 }, () => {});`,
    },
    {
      name: 'a decision id on the line above',
      code: `export default defineConfig({\n  // D-20261123-e2e-retries\n  retries: 2,\n});`,
    },
    {
      name: 'an issue URL on the same line',
      code: `it('x', { retry: 2 }, () => {}); // https://github.com/acme/app/issues/9`,
    },
    {
      name: 'a retry in a call that is not a test or a config',
      code: `fetchWithRetry({ retries: 3 });`,
    },
    {
      name: 'a retry in a call on a call',
      code: `make()({ retries: 3 });`,
    },
    {
      name: 'a retry passed through a function',
      code: `it('x', wrap({ retry: 3 }), () => {});`,
    },
    {
      name: 'a retry inside a function inside a config',
      code: `defineConfig({ build: () => ({ retries: 2 }) });`,
    },
    {
      name: 'a retry key at module scope of a non-config file',
      code: `export default { retries: 2 };`,
    },
    {
      name: 'a computed retry key is not read',
      code: `defineConfig({ [key]: 2 });`,
    },
    {
      name: 'a defineConfig method on another object',
      code: `builder.defineConfig({ retries: 2 });`,
    },
    {
      name: 'a numeric key',
      code: `defineConfig({ 1: 2 });`,
    },
    {
      name: 'a retryTimes that cites a decision',
      code: `jest.retryTimes(2); // D-12`,
    },
    {
      name: 'a retry in a call whose callee is not a chain',
      code: `registry[key]({ retries: 2 });`,
    },
    {
      name: 'jest.retryTimes(0)',
      code: `jest.retryTimes(0);`,
    },
    {
      name: 'a local jest is not the runner',
      code: `const jest = makeJest();\njest.retryTimes(3);`,
    },
    {
      name: 'jest imported from elsewhere',
      code: `import { jest } from './fake';\njest.retryTimes(3);`,
    },
    {
      name: 'retries on something other than this',
      code: `client.retries(3);`,
    },
    {
      name: 'a computed retry method that is not static',
      code: `jest[method](3);`,
    },
    {
      name: 'retryTimes on something other than jest',
      code: `runner.retryTimes(3);\nfoo().retryTimes(3);`,
    },
    {
      name: 'a non-retry call',
      code: `jest.fn();\nrun();`,
    },
  ],
  invalid: [
    {
      name: 'a test-level retry',
      code: `it('x', { retry: 3 }, () => {});`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'Playwright describe.configure',
      code: `import { test } from '@playwright/test';\ntest.describe.configure({ retries: 2 });`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'vitest config nested under test',
      code: `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { retry: 2 } });`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'a retry inside an array in a config',
      code: `defineConfig({ projects: [{ retry: 2 }] });`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'a CI-only retry is still a retry',
      code: `defineConfig({ 'retries': process.env.CI ? 2 : 0 });`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'anywhere in a playwright config file',
      filename: 'playwright.config.ts',
      code: `const config = { retries: 2 };\nexport default config;`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'a jest config file',
      filename: 'packages/app/jest.config.cjs',
      code: `module.exports = { projects: [{ retries: 1 }] };`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'jest.retryTimes (global)',
      code: `jest.retryTimes(3);`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'jest.retryTimes imported from @jest/globals',
      code: `import { jest } from '@jest/globals';\njest.retryTimes(2);`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'a computed string retry method and key',
      code: `jest['retryTimes'](3);\ndefineConfig({ ['retries']: 2 });`,
      errors: [{ messageId: 'testRetry' }, { messageId: 'testRetry' }],
    },
    {
      name: 'mocha this.retries',
      code: `describe('x', function () { this.retries(4); });`,
      errors: [{ messageId: 'testRetry' }],
    },
    {
      name: 'a comment that cites nothing',
      code: `// flaky upstream\nit('x', { retry: 2 }, () => {});`,
      errors: [{ messageId: 'testRetry' }],
    },
  ],
});
