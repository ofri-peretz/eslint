/**
 * Tests for iframe-has-title rule
 * Accessibility: WCAG 4.1.2 Name, Role, Value (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { iframeHasTitle } from '../rules/iframe-has-title';

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

describe('iframe-has-title', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - iframe with title', iframeHasTitle, {
      valid: [
        { code: '<iframe src="page.html" title="Page content"></iframe>' },
        { code: '<iframe src="video.html" title="Video player"></iframe>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - iframe without title', iframeHasTitle, {
      valid: [],
      invalid: [
        { code: '<iframe src="page.html"></iframe>', errors: [{ messageId: 'missingTitle' }] },
      ],
    });
  });
});
