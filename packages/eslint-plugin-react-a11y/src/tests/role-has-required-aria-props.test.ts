/**
 * Tests for role-has-required-aria-props rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { roleHasRequiredAriaProps } from '../rules/role-has-required-aria-props';

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

describe('role-has-required-aria-props', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - roles with required props', roleHasRequiredAriaProps, {
      valid: [
        { code: '<div role="checkbox" aria-checked="true"></div>' },
        { code: '<div role="slider" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100}></div>' },
        { code: '<div role="spinbutton" aria-valuenow={5} aria-valuemin={0} aria-valuemax={10}></div>' },
        { code: '<div role="combobox" aria-expanded="true" aria-controls="list"></div>' },
        { code: '<div role="button"></div>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing required props', roleHasRequiredAriaProps, {
      valid: [],
      invalid: [
        { code: '<div role="checkbox"></div>', errors: [{ messageId: 'missingRequiredProp' }] },
      ],
    });
  });
});
