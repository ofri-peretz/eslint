/**
 * Tests for html-has-lang rule
 * Accessibility: WCAG 3.1.1 Language of Page (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { htmlHasLang } from '../rules/html-has-lang';

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

describe('html-has-lang', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - html with lang', htmlHasLang, {
      valid: [
        { code: '<html lang="en"></html>' },
        { code: '<html lang="es"></html>' },
        { code: '<html lang="fr-CA"></html>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - html without lang', htmlHasLang, {
      valid: [],
      invalid: [
        { code: '<html></html>', errors: [{ messageId: 'missingLang' }] },
      ],
    });
  });
});
