/**
 * Tests for click-events-have-key-events rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { clickEventsHaveKeyEvents } from '../rules/click-events-have-key-events';

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

describe('click-events-have-key-events', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - has key handlers', clickEventsHaveKeyEvents, {
      valid: [
        { name: 'both handlers present', code: '<div onClick={handler} onKeyDown={handler}></div>' },
        { code: '<div onClick={handler} onKeyUp={handler}></div>' },
        { code: '<div onClick={handler} onKeyPress={handler}></div>' },
        { code: '<button onClick={handler}></button>' },
        { code: '<a href="#" onClick={handler}></a>' },
        { code: '<input onClick={handler} />' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing key handlers', clickEventsHaveKeyEvents, {
      valid: [],
      invalid: [
        { name: 'a click handler with no keyboard equivalent', code: '<div onClick={handler}></div>', errors: [{ messageId: 'missingKeyboardEvent' }] },
        { code: '<span onClick={handler}></span>', errors: [{ messageId: 'missingKeyboardEvent' }] },
        // An ARIA role does not make an element keyboard-operable: the author must handle keys (WAI-ARIA APG).
        { name: 'interactive ARIA role still needs a key handler', code: '<div role="button" tabIndex={0} onClick={handler} />', errors: [{ messageId: 'missingKeyboardEvent' }] },
        { name: 'menuitem role still needs a key handler', code: '<div role="menuitem" onClick={handler} />', errors: [{ messageId: 'missingKeyboardEvent' }] },
        // <a> without href is not focusable or keyboard-activated (HTML: placeholder link).
        { name: 'anchor without href is not natively keyboard-operable', code: '<a onClick={handler}>x</a>', errors: [{ messageId: 'missingKeyboardEvent' }] },
      ],
    });
  });
});
