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
        { name: 'a label wrapping its input', code: '<label htmlFor="id">Name<input id="id" /></label>' },
        // A dynamic htmlFor still associates the label (HTML label `for`)
        { name: 'dynamic htmlFor associates the label', code: '<label htmlFor={value}>Email</label>' },
        // HTML associates a nested labelable control at any depth
        { name: 'control nested four levels deep is associated', code: '<label>Email<span><span><span><input type="text" /></span></span></span></label>' },
        // labelAttributes names attributes that supply the label text
        { name: 'an expression child may render the label text', code: '<label htmlFor="email">{text}</label>' },
        { name: 'a component child may render the label text', code: '<label htmlFor="email"><Trans /></label>' },
        { name: 'a member component child may render the label text', code: '<label htmlFor="email"><Ui.Text /></label>' },
        { name: 'a fragment child may render the label text', code: '<label htmlFor="email"><>Email</></label>' },
        { name: 'labelAttributes supply the label text', code: '<label htmlFor="email" label="Email"></label>', options: [{ labelAttributes: ['label'] }] },
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
        // A label with no text names nothing (jsx-a11y: a form label must have accessible text)
        { name: 'label with no text', code: '<label htmlFor="email"></label>', errors: [{ messageId: 'missingText' }] },
        { name: 'label wrapping only its control has no text', code: '<label htmlFor="id"><input id="id" /></label>', errors: [{ messageId: 'missingText' }] },
        { name: 'an empty expression is not label text', code: '<label htmlFor="email">{/* todo */}</label>', errors: [{ messageId: 'missingText' }] },
        { name: 'a listed control component is not label text', code: '<label><TextField /></label>', options: [{ controlComponents: ['TextField'] }], errors: [{ messageId: 'missingText' }] },
        { name: 'an unlisted attribute is not label text', code: '<label htmlFor="email" label="Email"></label>', errors: [{ messageId: 'missingText' }] },
      ],
    });
  });
});
