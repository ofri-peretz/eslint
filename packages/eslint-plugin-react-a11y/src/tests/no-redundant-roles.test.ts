/**
 * Tests for no-redundant-roles rule
 * Accessibility: Best Practice
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedundantRoles } from '../rules/no-redundant-roles';

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

describe('no-redundant-roles', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no redundant roles', noRedundantRoles, {
      valid: [
        { code: '<button>Click</button>' },
        { code: '<a href="#">Link</a>' },
        { code: '<nav></nav>' },
        { code: '<main></main>' },
        { code: '<div role="button"></div>' },
        { code: '<span role="link"></span>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - redundant roles', noRedundantRoles, {
      valid: [],
      invalid: [
        { code: '<main role="main"></main>', errors: [{ messageId: 'redundantRole' }] },
        { code: '<article role="article"></article>', errors: [{ messageId: 'redundantRole' }] },
      ],
    });
  });
});
