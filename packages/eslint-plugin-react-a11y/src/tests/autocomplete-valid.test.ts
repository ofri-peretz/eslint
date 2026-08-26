/**
 * Tests for autocomplete-valid rule
 * Accessibility: WCAG 1.3.5 Identify Input Purpose (Level AA)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { autocompleteValid } from '../rules/autocomplete-valid';

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

describe('autocomplete-valid', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid autocomplete values', autocompleteValid, {
      valid: [
      {
        name: 'FN: two autocomplete tokens that cannot be combined — the rule checks each token, not the pairing',
        code: '<input autocomplete="name email" />',
      },
        { name: 'a valid token', code: '<input autocomplete="name" />' },
        { code: '<input autocomplete="email" />' },
        { code: '<input autocomplete="username" />' },
        { code: '<input autocomplete="current-password" />' },
        { code: '<input autocomplete="new-password" />' },
        { code: '<input autocomplete="tel" />' },
        { code: '<input autocomplete="address-line1" />' },
        { code: '<input autocomplete="off" />' },
        { code: '<input autocomplete="on" />' },
        { code: '<input />' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid autocomplete values', autocompleteValid, {
      valid: [],
      invalid: [
        { name: 'an autocomplete token that is not in the spec', code: '<input autocomplete="foo" />', errors: [{ messageId: 'invalidAutocomplete' }] },
        { code: '<input autocomplete="invalid" />', errors: [{ messageId: 'invalidAutocomplete' }] },
      ],
    });
  });
});
