/**
 * Tests for tabindex-no-positive rule
 * Accessibility: WCAG 2.4.3 Focus Order (Level A)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { tabindexNoPositive } from '../rules/tabindex-no-positive';

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

describe('tabindex-no-positive', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - non-positive tabindex', tabindexNoPositive, {
      valid: [
        { code: '<div tabIndex={0}></div>' },
        { code: '<div tabIndex={-1}></div>' },
        { code: '<div tabIndex="0"></div>' },
        { code: '<div tabIndex="-1"></div>' },
        { code: '<button>Click</button>' },
        { code: '<div></div>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - positive tabindex', tabindexNoPositive, {
      valid: [],
      invalid: [
        { code: '<div tabIndex="1"></div>', errors: [{ messageId: 'avoidPositiveTabIndex' }] },
        { code: '<button tabIndex="99">Click</button>', errors: [{ messageId: 'avoidPositiveTabIndex' }] },
      ],
    });
  });
});
