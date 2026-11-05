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
        { name: 'a real button', code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        { code: '<input onClick={handler} />' },
        { code: '<div role="button" tabIndex={0} onClick={handler}></div>' },
        { code: '<div role="link" tabIndex={0} onClick={handler}></div>' },
        { code: '<div></div>' },
        // No interactive role: not this rule's contract (no-static-element-interactions owns it)
        { name: 'role-less div with a click handler is out of scope', code: '<div onClick={handler}></div>' },
        { name: 'role-less span with a key handler is out of scope', code: '<span onKeyDown={handler}></span>' },
        { name: 'role presentation is the documented opt-out', code: '<div role="presentation" onClick={handler}></div>' },
        { name: 'non-interactive role is out of scope', code: '<div role="article" onClick={handler}></div>' },
        { name: 'tabIndex -1 is focusable when the role is not in tabbable', code: '<div role="button" tabIndex={-1} onClick={handler}></div>' },
        { name: 'interactive role without a handler is not checked', code: '<div role="button"></div>' },
        { name: 'aria-disabled interactive element is exempt', code: '<div role="button" aria-disabled="true" onClick={handler}></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - non-focusable interactives', interactiveSupportsFocus, {
      valid: [],
      invalid: [
        // An ARIA role never makes an element focusable (WAI-ARIA 1.2): tabIndex is required
        { name: 'interactive role with a click handler and no way to focus it', code: '<div role="button" onClick={handler} />', errors: [{ messageId: 'missingTabIndex' }] },
        { name: 'menuitem role with no tabIndex', code: '<div role="menuitem" onClick={handler} />', errors: [{ messageId: 'missingTabIndex' }] },
        { name: 'link role on a span with a key handler and no tabIndex', code: '<span role="link" onKeyDown={handler}></span>', errors: [{ messageId: 'missingTabIndex' }] },
        { name: 'tabbable lists roles: tabIndex -1 leaves a tabbable role out of the tab order', code: '<div role="button" tabIndex={-1} onClick={handler}></div>', options: [{ tabbable: ['button'] }], errors: [{ messageId: 'missingTabIndex' }] },
      ],
    });
  });
});
