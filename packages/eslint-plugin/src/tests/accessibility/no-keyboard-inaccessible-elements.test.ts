/**
 * Comprehensive tests for no-keyboard-inaccessible-elements rule
 * Accessibility: Detects clickable divs without keyboard support
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noKeyboardInaccessibleElements } from '../../rules/accessibility/no-keyboard-inaccessible-elements';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-keyboard-inaccessible-elements', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - accessible elements', noKeyboardInaccessibleElements, {
      valid: [
        // Div with tabIndex and role
        {
          code: '<div onClick={handler} tabIndex={0} role="button">Click</div>',
        },
        // Div with role
        {
          code: '<div onClick={handler} role="button">Click</div>',
        },
        // Button element (native keyboard support)
        {
          code: '<button onClick={handler}>Click</button>',
        },
        // Div without onClick (not clickable)
        {
          code: '<div>Content</div>',
        },
        // Test files (if ignoreInTests is true)
        {
          code: '<div onClick={handler}>Click</div>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Inaccessible Elements', () => {
    ruleTester.run('invalid - clickable div without keyboard support', noKeyboardInaccessibleElements, {
      valid: [],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noKeyboardInaccessibleElements, {
      valid: [
        {
          code: '<div onClick={handler}>Click</div>',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - checkElements', noKeyboardInaccessibleElements, {
      valid: [
        {
          code: '<p onClick={handler}>Click</p>',
          options: [{ checkElements: ['div', 'span'] }], // p not checked
        },
      ],
      invalid: [],
    });
  });
});

