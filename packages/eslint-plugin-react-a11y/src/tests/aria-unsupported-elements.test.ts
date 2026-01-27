/**
 * Tests for aria-unsupported-elements rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { ariaUnsupportedElements } from '../rules/aria-unsupported-elements';

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

describe('aria-unsupported-elements', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no aria on unsupported', ariaUnsupportedElements, {
      valid: [
        { code: '<div aria-label="Label"></div>' },
        { code: '<button aria-pressed="true"></button>' },
        { code: '<meta charset="UTF-8" />' },
        { code: '<html lang="en"></html>' },
        { code: '<script src="app.js"></script>' },
        { code: '<style>{css}</style>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - aria on unsupported elements', ariaUnsupportedElements, {
      valid: [],
      invalid: [
        { code: '<meta aria-label="Label" />', errors: [{ messageId: 'unsupportedAria' }] },
        { code: '<html aria-hidden="true"></html>', errors: [{ messageId: 'unsupportedAria' }] },
      ],
    });
  });
});
