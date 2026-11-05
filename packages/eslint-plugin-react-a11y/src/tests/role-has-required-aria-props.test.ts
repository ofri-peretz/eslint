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
        {
          // @found corpus scan (okta-signin-widget): not extended to components
          name: 'a braced role on a component is not judged',
          code: '<Comp role={"checkbox"} />',
        },
        { name: 'aria-checked supplied', code: '<div role="checkbox" aria-checked="true"></div>' },
        { code: '<div role="slider" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100}></div>' },
        { code: '<div role="spinbutton" aria-valuenow={5} aria-valuemin={0} aria-valuemax={10}></div>' },
        { code: '<div role="combobox" aria-expanded="true" aria-controls="list"></div>' },
        { code: '<div role="button"></div>' },
        { code: '<div></div>' },
        {
          name: 'slider with aria-valuenow alone (min/max have WAI-ARIA 1.2 defaults)',
          code: '<div role="slider" aria-valuenow={5}></div>',
        },
        {
          name: 'scrollbar with aria-controls and aria-valuenow (orientation/min/max have defaults)',
          code: '<div role="scrollbar" aria-controls="pane" aria-valuenow={5}></div>',
        },
        {
          name: 'a native checkbox exposes aria-checked from its checked state',
          code: '<input type="checkbox" role="switch" />; <input type="checkbox" role="menuitemcheckbox" />',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing required props', roleHasRequiredAriaProps, {
      valid: [],
      invalid: [
        { name: "role='checkbox' with no aria-checked — state is unannounced", code: '<div role="checkbox"></div>', errors: [{ messageId: 'missingRequiredProp' }] },
        {
          // One report per missing prop, so the count is the shape of the
          // role's contract rather than a single "incomplete" verdict.
          name: 'combobox requires more than one prop, and reports for each',
          code: '<div role="combobox"></div>',
          errors: [{ messageId: 'missingRequiredProp' }, { messageId: 'missingRequiredProp' }],
        },
        {
          // WAI-ARIA 1.2: only aria-valuenow is required; aria-valuemin and
          // aria-valuemax default to 0 and 100.
          name: 'slider requires aria-valuenow, its only required prop',
          code: '<div role="slider"></div>',
          errors: [{ messageId: 'missingRequiredProp' }],
        },
        {
          name: 'a required prop missing behind a braced role',
          code: '<div role={"checkbox"}></div>',
          errors: [{ messageId: 'missingRequiredProp' }],
        },
        {
          name: 'a required prop missing behind a constant template role',
          code: '<div role={`switch`}></div>',
          errors: [{ messageId: 'missingRequiredProp' }],
        },
        {
          name: 'scrollbar still requires aria-controls',
          code: '<div role="scrollbar" aria-valuenow={5}></div>',
          errors: [{ messageId: 'missingRequiredProp' }],
        },
      ],
    });
  });
});
