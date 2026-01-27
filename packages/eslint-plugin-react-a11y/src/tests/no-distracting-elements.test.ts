/**
 * Tests for no-distracting-elements rule
 * Accessibility: WCAG 2.2.2 Pause, Stop, Hide (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDistractingElements } from '../rules/no-distracting-elements';

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

describe('no-distracting-elements', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no distracting elements', noDistractingElements, {
      valid: [
        { code: '<div></div>' },
        { code: '<span></span>' },
        { code: '<p>Text</p>' },
        { code: '<img src="image.png" alt="Image" />' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - distracting elements', noDistractingElements, {
      valid: [],
      invalid: [
        { code: '<blink>Blinking text</blink>', errors: [{ messageId: 'noDistractingElements' }] },
        { code: '<marquee>Scrolling text</marquee>', errors: [{ messageId: 'noDistractingElements' }] },
      ],
    });
  });
});
