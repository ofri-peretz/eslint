/**
 * Tests for aria-props rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ariaProps } from '../rules/aria-props';

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
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('aria-props', () => {
  describe('Valid Code - Valid ARIA Attributes', () => {
    ruleTester.run('valid - standard ARIA attributes', ariaProps, {
      valid: [
        // Common ARIA attributes
        { code: '<div aria-label="Label"></div>' },
        { code: '<div aria-labelledby="id"></div>' },
        { code: '<div aria-describedby="id"></div>' },
        { code: '<div aria-hidden="true"></div>' },
        { code: '<div aria-expanded="false"></div>' },
        { code: '<div aria-selected="true"></div>' },
        { code: '<div aria-checked="true"></div>' },
        { code: '<div aria-disabled="true"></div>' },
        { code: '<div aria-required="true"></div>' },
        { code: '<div aria-readonly="true"></div>' },
        { code: '<div aria-invalid="true"></div>' },
        { code: '<div aria-busy="true"></div>' },
        { code: '<div aria-live="polite"></div>' },
        { code: '<div aria-atomic="true"></div>' },
        { code: '<div aria-relevant="additions"></div>' },
        { code: '<div aria-controls="id"></div>' },
        { code: '<div aria-owns="id"></div>' },
        { code: '<div aria-haspopup="true"></div>' },
        { code: '<div aria-pressed="true"></div>' },
        { code: '<div aria-current="page"></div>' },
        { code: '<div aria-modal="true"></div>' },
        { code: '<div aria-placeholder="Enter text"></div>' },
        { code: '<div aria-valuemin="0"></div>' },
        { code: '<div aria-valuemax="100"></div>' },
        { code: '<div aria-valuenow="50"></div>' },
        { code: '<div aria-valuetext="50%"></div>' },
        // Non-aria attributes (should not trigger)
        { code: '<div data-aria="value"></div>' },
        { code: '<div className="aria-label"></div>' },
        { code: '<div id="aria-test"></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Invalid ARIA Attributes', () => {
    ruleTester.run('invalid - typos and non-existent attributes', ariaProps, {
      valid: [],
      invalid: [
        // Common typos
        {
          code: '<div aria-lable="Label"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        {
          code: '<div aria-labelled-by="id"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        {
          code: '<div aria-discribedby="id"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        // Made-up attributes
        {
          code: '<div aria-custom="value"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        {
          code: '<div aria-foo="bar"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        {
          code: '<div aria-visible="true"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
        // Deprecated/non-standard
        {
          code: '<div aria-xyz="value"></div>',
          errors: [{ messageId: 'invalidAriaProp' }],
        },
      ],
    });
  });

  describe('Multiple Invalid Attributes', () => {
    ruleTester.run('multiple invalid', ariaProps, {
      valid: [],
      invalid: [
        {
          code: '<div aria-lable="Label" aria-discribedby="id"></div>',
          errors: [
            { messageId: 'invalidAriaProp' },
            { messageId: 'invalidAriaProp' },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', ariaProps, {
      valid: [
        // Empty aria- prefix (weird but not invalid per the rule)
        // Non-JSX identifiers
        { code: '<div role="button"></div>' },
        // Valid aria with complex values
        { code: '<div aria-label={dynamicValue}></div>' },
      ],
      invalid: [],
    });
  });

  describe('FP Protection - Known False Positives', () => {
    ruleTester.run('FP protection', ariaProps, {
      valid: [
        // Spread attributes (might contain valid aria props)
        { code: '<div {...ariaProps}></div>' },
        // Dynamic attribute names - not caught (would need type info)
        // { code: '<div {...{[`aria-${type}`]: value}}></div>' },
      ],
      invalid: [],
    });
  });
});
