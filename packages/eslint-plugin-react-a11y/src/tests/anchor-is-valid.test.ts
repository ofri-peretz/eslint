/**
 * Tests for anchor-is-valid rule
 * Accessibility: WCAG 2.4.4 Link Purpose (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { anchorIsValid } from '../rules/anchor-is-valid';

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

describe('anchor-is-valid', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid anchors', anchorIsValid, {
      valid: [
        { code: '<a href="https://example.com">Link</a>' },
        { code: '<a href="/page">Link</a>' },
        { code: '<a href="#section">Link</a>' },
        { code: '<a href="mailto:test@example.com">Email</a>' },
        { code: '<a href="tel:+1234567890">Call</a>' },
        { code: '<button onClick={handleClick}>Button</button>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid anchors', anchorIsValid, {
      valid: [],
      invalid: [
        { code: '<a href="#">Link</a>', errors: [{ messageId: 'invalidHref' }] },
        { code: '<a href="javascript:void(0)">Link</a>', errors: [{ messageId: 'invalidHref' }] },
        { code: '<a onClick={handleClick}>Link</a>', errors: [{ messageId: 'preferButton' }] },
        { code: '<a href="#" onClick={handleClick}>Link</a>', errors: [{ messageId: 'preferButton' }] },
      ],
    });
  });
});
