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
        { code: '<input />' },
        { code: '<button>Click</button>' },
        { code: '<textarea></textarea>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - has autofocus', noAutofocus, {
      valid: [],
      invalid: [
        { code: '<input autoFocus />', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<input autoFocus={true} />', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<button autoFocus>Click</button>', errors: [{ messageId: 'noAutoFocus' }] },
        { code: '<textarea autoFocus></textarea>', errors: [{ messageId: 'noAutoFocus' }] },
      ],
    });
  });
});
