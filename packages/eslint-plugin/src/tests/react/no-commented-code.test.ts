/**
 * Comprehensive tests for no-commented-code rule
 * Quality: Detects commented-out code blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCommentedCode } from '../../rules/quality/no-commented-code';

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

describe('no-commented-code', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no commented code', noCommentedCode, {
      valid: [
        // Regular comments (not code)
        {
          code: '// This is a regular comment',
        },
        {
          code: '/* This is a block comment */',
        },
        // TODO comments (allowed)
        {
          code: '// TODO: Fix this later',
        },
        {
          code: '// FIXME: Need to refactor',
        },
        // Single line (if ignoreSingleLine is true)
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: true }],
        },
        // Test files (if ignoreInTests is true)
        {
          code: `
            // const oldCode = "removed";
            // function oldFunction() { }
          `,
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Commented Code', () => {
    ruleTester.run('invalid - commented code blocks', noCommentedCode, {
      valid: [],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreSingleLine', noCommentedCode, {
      valid: [
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - minLines', noCommentedCode, {
      valid: [
        {
          code: `
            // const x = 1;
          `,
          options: [{ minLines: 3 }], // Below threshold
        },
      ],
      invalid: [],
    });
  });
});

