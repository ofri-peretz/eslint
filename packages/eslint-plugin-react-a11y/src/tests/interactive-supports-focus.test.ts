/**
 * Tests for interactive-supports-focus rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { interactiveSupportsFocus } from '../rules/interactive-supports-focus';

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

describe('interactive-supports-focus', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - focusable interactives', interactiveSupportsFocus, {
      valid: [
        { code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        { code: '<input onClick={handler} />' },
        { code: '<div role="button" tabIndex={0} onClick={handler}></div>' },
        { code: '<div role="link" tabIndex={0} onClick={handler}></div>' },
        { code: '<div></div>' },
        // Interactive ARIA role — AT/browser keyboard model handles focus; tabIndex not required
        { code: '<div role="button" onClick={handler} />' },
        { code: '<div role="menuitem" onClick={handler} />' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - non-focusable interactives', interactiveSupportsFocus, {
      valid: [],
      invalid: [
        // No role: div with onClick but no tabIndex — must be focusable
        { code: '<div onClick={handler}></div>', errors: [{ messageId: 'missingTabIndex' }] },
        { code: '<span onKeyDown={handler}></span>', errors: [{ messageId: 'missingTabIndex' }] },
      ],
    });
  });
});
