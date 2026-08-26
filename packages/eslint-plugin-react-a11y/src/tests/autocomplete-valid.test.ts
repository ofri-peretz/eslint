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
      /**
       * Four spec-valid forms the rule used to reject.
       *
       * HTML defines autocomplete as an ordered sequence —
       * `[section-*] [shipping|billing] [home|work|mobile|fax|pager] field [webauthn]`
       * — and the rule checked every token against the FIELD-NAME set alone.
       * A modifier is not a field name, so all four reported.
       */
      { name: 'FP: a shipping address modifier', code: '<input autocomplete="shipping street-address" />' },
      { name: 'FP: a billing address modifier', code: '<input autocomplete="billing cc-number" />' },
      { name: 'FP: a contact-channel modifier', code: '<input autocomplete="home tel" />' },
      { name: 'FP: the webauthn credential suffix', code: '<input autocomplete="username webauthn" />' },
      { name: 'a section label with a modifier and a field', code: '<input autocomplete="section-a billing home tel" />' },
      { name: 'off stands alone', code: '<input autocomplete="off" />' },
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
      {
        // Both tokens are legal field names, and exactly one field name is
        // allowed. Checking tokens singly could never see this.
        name: 'two field names, where the grammar allows one',
        code: '<input autocomplete="name email" />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
      {
        name: 'a modifier in the wrong order',
        code: '<input autocomplete="street-address shipping" />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
      {
        name: 'off combined with a field name',
        code: '<input autocomplete="off name" />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
      {
        name: 'a trailing token after webauthn',
        code: '<input autocomplete="username webauthn extra" />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
      {
        // Same family as the empty `lang` and empty `title` fixed alongside
        // this: the attribute is present and says nothing. The autofill
        // algorithm derives no field name from it, so the control gets none.
        name: 'an empty autocomplete names no field',
        code: '<input autocomplete="" />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
      {
        name: 'whitespace only, which is the same thing',
        code: '<input autocomplete="   " />',
        errors: [{ messageId: 'invalidAutocomplete' }],
      },
        { name: 'an autocomplete token that is not in the spec', code: '<input autocomplete="foo" />', errors: [{ messageId: 'invalidAutocomplete' }] },
        { code: '<input autocomplete="invalid" />', errors: [{ messageId: 'invalidAutocomplete' }] },
      ],
    });
  });
});
