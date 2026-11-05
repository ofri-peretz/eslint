/**
 * Tests for no-autofocus rule
 * Accessibility: WCAG 2.4.3 Focus Order (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAutofocus } from '../rules/no-autofocus';

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

describe('no-autofocus', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no autofocus', noAutofocus, {
      valid: [
        { name: 'no autofocus', code: '<input />' },
        { code: '<button>Click</button>' },
        { code: '<textarea></textarea>' },
        // Nothing gets focus
        { name: 'autoFocus false does not focus', code: '<input autoFocus={false} />' },
        { name: 'autoFocus undefined does not focus', code: '<input autoFocus={undefined} />' },
        // ignoreNonDOM exempts custom components
        { name: 'ignoreNonDOM exempts a component', code: '<TextInput autoFocus />', options: [{ ignoreNonDOM: true }] },
        { name: 'ignoreNonDOM exempts a member component', code: '<Ui.TextInput autoFocus />', options: [{ ignoreNonDOM: true }] },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - has autofocus', noAutofocus, {
      valid: [],
      invalid: [
        { name: 'autoFocus moves focus before the user has read the page', code: '<input autoFocus />', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<input autoFocus={true} />', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<button autoFocus>Click</button>', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<textarea autoFocus></textarea>', errors: [{ messageId: 'noAutoFocus' }] },
        { name: 'components are checked by default', code: '<TextInput autoFocus />', errors: [{ messageId: 'noAutoFocus' }] },
        { name: 'ignoreNonDOM still checks DOM elements', code: '<input autoFocus />', options: [{ ignoreNonDOM: true }], errors: [{ messageId: 'noAutoFocus' }] },
        // HTML attribute names are case-insensitive: autofocus reaches the DOM too
        { name: 'HTML autofocus spelling', code: '<input autofocus />', errors: [{ messageId: 'noAutoFocus' }] },
      ],
    });
  });
});
