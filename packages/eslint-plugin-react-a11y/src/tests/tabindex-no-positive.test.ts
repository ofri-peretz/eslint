/**
 * Tests for tabindex-no-positive rule
 * Accessibility: WCAG 2.4.3 Focus Order (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { tabindexNoPositive } from '../rules/tabindex-no-positive';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('tabindex-no-positive', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - non-positive tabindex', tabindexNoPositive, {
      valid: [
        {
          // @found corpus scan (okta-signin-widget): not extended to components
          name: 'a braced tabIndex on a component is not judged',
          code: '<Comp tabIndex={1} />',
        },
        { name: 'tabIndex zero', code: '<div tabIndex={0}></div>' },
        { code: '<div tabIndex={-1}></div>' },
        { code: '<div tabIndex="0"></div>' },
        { code: '<div tabIndex="-1"></div>' },
        { code: '<button>Click</button>' },
        { code: '<div></div>' },
        {
          name: 'a tabIndex the file cannot know',
          code: '<div tabIndex={index}>x</div>',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - positive tabindex', tabindexNoPositive, {
      valid: [],
      invalid: [
      {
        name: 'a positive index on a natively focusable element',
        code: '<a href="/x" tabIndex="2">Link</a>',
        errors: [{ messageId: 'avoidPositiveTabIndex' }],
      },
        { name: "a positive tabIndex reorders the whole document's tab sequence", code: '<div tabIndex="1"></div>', errors: [{ messageId: 'avoidPositiveTabIndex' }] },
        { code: '<button tabIndex="99">Click</button>', errors: [{ messageId: 'avoidPositiveTabIndex' }] },
        {
          name: 'a positive tabIndex written as a braced number, the usual React spelling',
          code: '<div tabIndex={1}>x</div>',
          errors: [{ messageId: 'avoidPositiveTabIndex' }],
        },
        {
          name: 'a positive tabIndex written as a braced string or a constant template',
          code: '<div tabIndex={"2"}>x</div>; <div tabIndex={`3`}>y</div>',
          errors: [{ messageId: 'avoidPositiveTabIndex' }, { messageId: 'avoidPositiveTabIndex' }],
        },
        {
          name: 'a positive tabIndex in both branches of a conditional',
          code: '<div tabIndex={flag ? 1 : 1}>x</div>',
          errors: [{ messageId: 'avoidPositiveTabIndex' }],
        },
        {
          name: 'the lowercase tabindex attribute, which React still renders',
          code: '<div tabindex="1">x</div>',
          errors: [{ messageId: 'avoidPositiveTabIndex' }],
        },
      ],
    });
  });
});
