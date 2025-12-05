/**
 * Tests for no-unsafe-regex-construction rule
 * Security: CWE-400 (Uncontrolled Resource Consumption)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeRegexConstruction } from '../../rules/security/no-unsafe-regex-construction';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-regex-construction', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex construction', noUnsafeRegexConstruction, {
      valid: [
        'const regex = /^[a-z]+$/;',
        'const safeRegex = new RegExp("^[0-9]+$");',
        'const pattern = /^.{1,100}$/;',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Regex Construction', () => {
    ruleTester.run('invalid - user-controlled regex patterns', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        {
          code: 'const regex = new RegExp(userInput);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: 'const pattern = new RegExp(`^${userPattern}$`);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });
});
