/**
 * Tests for no-static-element-interactions rule
 * Accessibility: WCAG 2.1.1 Keyboard (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticElementInteractions } from '../rules/no-static-element-interactions';

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

describe('no-static-element-interactions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper interactive elements', noStaticElementInteractions, {
      valid: [
        { code: '<button onClick={handler}>Click</button>' },
        { code: '<a href="#" onClick={handler}>Link</a>' },
        { code: '<div role="button" onClick={handler}></div>' },
        { code: '<div role="link" onClick={handler}></div>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - static element with handlers', noStaticElementInteractions, {
      valid: [],
      invalid: [
        { code: '<div onClick={handler}></div>', errors: [{ messageId: 'noStaticInteraction' }] },
        { code: '<span onClick={handler}></span>', errors: [{ messageId: 'noStaticInteraction' }] },
      ],
    });
  });
});
