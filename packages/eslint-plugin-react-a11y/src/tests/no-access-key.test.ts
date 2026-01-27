/**
 * Tests for no-access-key rule
 * Accessibility: WCAG 2.4.1 Bypass Blocks (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAccessKey } from '../rules/no-access-key';

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

describe('no-access-key', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no accessKey', noAccessKey, {
      valid: [
        { code: '<button>Click</button>' },
        { code: '<a href="#">Link</a>' },
        { code: '<input />' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - has accessKey', noAccessKey, {
      valid: [],
      invalid: [
        { code: '<button accessKey="s">Save</button>', errors: [{ messageId: 'noAccessKey' }] },
        { code: '<a href="#" accessKey="h">Home</a>', errors: [{ messageId: 'noAccessKey' }] },
        { code: '<input accessKey="i" />', errors: [{ messageId: 'noAccessKey' }] },
      ],
    });
  });
});
