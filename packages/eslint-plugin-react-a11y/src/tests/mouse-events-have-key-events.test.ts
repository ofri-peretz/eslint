/**
 * Tests for mouse-events-have-key-events rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { mouseEventsHaveKeyEvents } from '../rules/mouse-events-have-key-events';

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

describe('mouse-events-have-key-events', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - mouse with key events', mouseEventsHaveKeyEvents, {
      valid: [
        { code: '<div onMouseOver={handler} onFocus={handler}></div>' },
        { code: '<div onMouseOut={handler} onBlur={handler}></div>' },
        { code: '<div onMouseEnter={handler} onFocus={handler}></div>' },
        { code: '<div onMouseLeave={handler} onBlur={handler}></div>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - mouse without key events', mouseEventsHaveKeyEvents, {
      valid: [],
      invalid: [
        { code: '<div onMouseOver={handler}></div>', errors: [{ messageId: 'missingOnFocus' }] },
        { code: '<div onMouseOut={handler}></div>', errors: [{ messageId: 'missingOnBlur' }] },
      ],
    });
  });
});
