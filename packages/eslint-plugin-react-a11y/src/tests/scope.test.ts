/**
 * Tests for scope rule
 * Accessibility: WCAG 1.3.1 Info and Relationships (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { scope } from '../rules/scope';

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

describe('scope', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - scope on th', scope, {
      valid: [
        { name: 'scope on a th', code: '<th scope="col">Header</th>' },
        { code: '<th scope="row">Row Header</th>' },
        { code: '<th scope="colgroup">Group</th>' },
        { code: '<th scope="rowgroup">Group</th>' },
        { code: '<td>Data</td>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - scope on non-th', scope, {
      valid: [],
      invalid: [
      {
        name: 'scope means nothing outside a table header',
        code: '<span scope="col">Header</span>',
        errors: [{ messageId: 'invalidScope' }],
      },
        { name: 'scope on a td, where it means nothing', code: '<td scope="col">Data</td>', errors: [{ messageId: 'invalidScope' }] },
        { code: '<div scope="row">Content</div>', errors: [{ messageId: 'invalidScope' }] },
      ],
    });
  });
});
