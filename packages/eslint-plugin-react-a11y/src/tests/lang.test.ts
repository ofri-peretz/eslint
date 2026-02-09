/**
 * Tests for lang rule
 * Accessibility: WCAG 3.1.1 Language of Page (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { lang } from '../rules/lang';

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

describe('lang', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - valid lang codes', lang, {
      valid: [
        { code: '<html lang="en"></html>' },
        { code: '<html lang="en-US"></html>' },
        { code: '<html lang="fr"></html>' },
        { code: '<html lang="zh-Hans"></html>' },
        { code: '<div lang="es"></div>' },
        { code: '<span lang="de"></span>' },
        // 3-letter ISO codes are valid
        { code: '<html lang="yue"></html>' },
        // Non-lang attribute should be ignored
        { code: '<html id="main"></html>' },
        // Expression value should be ignored (not a string literal)
        { code: '<html lang={locale}></html>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - invalid lang codes', lang, {
      valid: [],
      invalid: [
        { code: '<html lang="invalid"></html>', errors: [{ messageId: 'invalidLang' }] },
        // Single char is invalid
        { code: '<html lang="e"></html>', errors: [{ messageId: 'invalidLang' }] },
        // 4+ chars without hyphen is invalid
        { code: '<html lang="abcd"></html>', errors: [{ messageId: 'invalidLang' }] },
      ],
    });
  });
});
