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
        { /* @found fidelity model react-a11y/html_has_lang */ name: 'FP: a static lang in braces is a value', code: '<html lang={"en"}></html>' },
        { /* @found fidelity model react-a11y/html_has_lang */ name: 'FP: a template lang is a value', code: '<html lang={`en`}></html>' },
        { /* @found fidelity model react-a11y/html_has_lang */ name: 'FP: a dynamic lang is a value the file cannot see', code: '<html lang={value}></html>' },
        { name: 'lang is set', code: '<html lang="en"></html>' },
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
      {
        // @found fidelity model react-a11y/html_has_lang
        name: 'FN: lang={undefined} renders no lang',
        code: '<html lang={undefined}></html>',
        errors: [{ messageId: 'missingLang' }],
      },
      {
        // @found rule review
        name: 'FN: an empty lang names no language',
        code: '<html lang=""></html>',
        errors: [{ messageId: 'missingLang' }],
      },
      {
        name: 'other attributes present, still no lang',
        code: '<html dir="ltr"></html>',
        errors: [{ messageId: 'missingLang' }],
      },
        { name: 'no lang, so the screen reader guesses the language', code: '<html></html>', errors: [{ messageId: 'missingLang' }] },
      ],
    });
  });
});
