/**
 * @fileoverview Tests for no-focused-test
 *
 * The traps: `.only` on something that is not a test runner (a local `it`, an
 * `it` imported from elsewhere, a query builder's `.only()`), and the chained
 * `.each` form, which must report once.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noFocusedTest } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-focused-test', noFocusedTest, {
  valid: [
    { name: 'a plain test', code: `it('adds', () => {});` },
    {
      name: 'a plain suite',
      code: `describe('math', () => { test('adds', () => {}); });`,
    },
    {
      name: 'a local function named it is not a test runner',
      code: `const it = { only: () => {} };\nit.only('x', () => {});`,
    },
    {
      name: 'an it imported from a non-test module is not a test runner',
      code: `import { it } from './iterators';\nit.only('x');`,
    },
    {
      name: 'a query builder .only() is not a test',
      code: `query.only('id');`,
    },
    {
      name: 'a computed key that is not a string is not read',
      code: `it[key]('x', () => {});`,
    },
    {
      name: 'a call on a call whose callee is not a chain',
      code: `it[key]()('x', () => {});`,
    },
    {
      name: 'a chain rooted in this',
      code: `this.only('x');`,
    },
    {
      name: 'a callee that is not a member chain',
      code: `getTest()('x', () => {});`,
    },
    {
      name: 'an each table without focus',
      code: `it.each([1, 2])('x %i', () => {});`,
    },
    {
      name: 'a non-runner default import is not a test runner',
      code: `import fit from 'fit-text';\nfit('x');`,
    },
    {
      name: 'a non-test name imported from vitest',
      code: `import { vi } from 'vitest';\nvi.only('x');`,
    },
  ],
  invalid: [
    {
      name: 'it.only (global)',
      code: `it.only('adds', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            { messageId: 'removeFocus', output: `it('adds', () => {});` },
          ],
        },
      ],
    },
    {
      name: 'describe.only imported from vitest',
      code: `import { describe } from 'vitest';\ndescribe.only('math', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            {
              messageId: 'removeFocus',
              output: `import { describe } from 'vitest';\ndescribe('math', () => {});`,
            },
          ],
        },
      ],
    },
    {
      name: 'Playwright test.describe.only via the default export',
      code: `import test from '@playwright/test';\ntest.describe.only('page', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            {
              messageId: 'removeFocus',
              output: `import test from '@playwright/test';\ntest.describe('page', () => {});`,
            },
          ],
        },
      ],
    },
    {
      name: 'an aliased import reads by its imported name',
      code: `import { test as check } from 'vitest';\ncheck.only('x', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            {
              messageId: 'removeFocus',
              output: `import { test as check } from 'vitest';\ncheck('x', () => {});`,
            },
          ],
        },
      ],
    },
    {
      name: 'a string-literal import name',
      code: `import { 'it' as spec } from 'vitest';\nspec.only('x', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            {
              messageId: 'removeFocus',
              output: `import { 'it' as spec } from 'vitest';\nspec('x', () => {});`,
            },
          ],
        },
      ],
    },
    {
      name: 'it.only.each reports once, on the inner call',
      code: `it.only.each([1, 2])('x %i', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            {
              messageId: 'removeFocus',
              output: `it.each([1, 2])('x %i', () => {});`,
            },
          ],
        },
      ],
    },
    {
      name: 'a computed string key',
      code: `it['only']('x', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            { messageId: 'removeFocus', output: `it('x', () => {});` },
          ],
        },
      ],
    },
    {
      name: 'fit',
      code: `fit('x', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            { messageId: 'removeFocus', output: `it('x', () => {});` },
          ],
        },
      ],
    },
    {
      name: 'fdescribe',
      code: `fdescribe('x', () => {});`,
      errors: [
        {
          messageId: 'focusedTest',
          suggestions: [
            { messageId: 'removeFocus', output: `describe('x', () => {});` },
          ],
        },
      ],
    },
  ],
});
