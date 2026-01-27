/**
 * Tests for no-noninteractive-element-interactions rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNoninteractiveElementInteractions } from '../rules/no-noninteractive-element-interactions';

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

describe('no-noninteractive-element-interactions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid interactions', noNoninteractiveElementInteractions, {
      valid: [
        { code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        { code: '<input onClick={handler} />' },
        { code: '<div role="button" onClick={handler}></div>' },
        { code: '<p>Text only</p>' },
        { code: '<article></article>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - interactions on non-interactive', noNoninteractiveElementInteractions, {
      valid: [],
      invalid: [
        { code: '<p onClick={handler}>Click me</p>', errors: [{ messageId: 'noInteraction' }] },
        { code: '<article onClick={handler}>Content</article>', errors: [{ messageId: 'noInteraction' }] },
        { code: '<section onClick={handler}>Section</section>', errors: [{ messageId: 'noInteraction' }] },
      ],
    });
  });
});
