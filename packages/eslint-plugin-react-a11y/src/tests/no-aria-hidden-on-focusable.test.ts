/**
 * Tests for no-aria-hidden-on-focusable rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAriaHiddenOnFocusable } from '../rules/no-aria-hidden-on-focusable';

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

describe('no-aria-hidden-on-focusable', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no aria-hidden on focusable', noAriaHiddenOnFocusable, {
      valid: [
        { code: '<div aria-hidden="true"></div>' },
        { code: '<span aria-hidden="true"></span>' },
        { code: '<button>Click</button>' },
        { code: '<a href="#">Link</a>' },
        { code: '<button aria-hidden="false">Click</button>' },
        { code: '<div tabIndex={-1} aria-hidden="true"></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - aria-hidden on focusable', noAriaHiddenOnFocusable, {
      valid: [],
      invalid: [
        { code: '<button aria-hidden="true">Click</button>', errors: [{ messageId: 'ariaHiddenFocusable' }] },
        { code: '<a href="#" aria-hidden="true">Link</a>', errors: [{ messageId: 'ariaHiddenFocusable' }] },
        { code: '<input aria-hidden="true" />', errors: [{ messageId: 'ariaHiddenFocusable' }] },
      ],
    });
  });
});
