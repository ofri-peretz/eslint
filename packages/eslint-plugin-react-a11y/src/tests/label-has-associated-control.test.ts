/**
 * Tests for label-has-associated-control rule
 * Accessibility: WCAG 1.3.1 Info and Relationships (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { labelHasAssociatedControl } from '../rules/label-has-associated-control';

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

describe('label-has-associated-control', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - labels with controls', labelHasAssociatedControl, {
      valid: [
        { name: 'a label wrapping its input', code: '<label htmlFor="id"><input id="id" /></label>' },
        { code: '<label><input />Label</label>' },
        { code: '<label><span>Label</span><input /></label>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    }); 
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - labels without controls', labelHasAssociatedControl, {
      valid: [],
      invalid: [
        { name: 'a label with nothing to label', code: '<label>Orphan Label</label>', errors: [{ messageId: 'missingControl' }] },
      ],
    });
  });
});
