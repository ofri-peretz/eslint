/**
 * Comprehensive tests for no-commented-code rule
 * Quality: Detects commented-out code blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCommentedCode } from '../../rules/conventions/no-commented-code';

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
        { code: '// This is a regular comment' },
        { code: '/* This is a block comment */' },
        // TODO comments (allowed)
        { code: '// TODO: Fix this later' },
        { code: '// FIXME: Need to refactor' },
        { code: '// HACK: Temporary workaround' },
        { code: '// XXX: Known issue' },
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
        // Below minLines threshold
        {
          code: '// const x = 1;',
          options: [{ minLines: 3 }],
        },
        // Empty block comment
        { code: '/**  */' },
        // Descriptive text that doesn't match code patterns
        { code: '// This describes what the function does' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code — Commented-out code detected', () => {
    ruleTester.run(
      'invalid - commented code patterns',
      noCommentedCode,
      {
        valid: [],
        invalid: [
          // Variable declaration
          {
            code: '// const x = 1;',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Function declaration
          {
            code: '// function doStuff() {',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Import statement
          {
            code: '// import lodash from "lodash";',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Block comment with code inside
          {
            code: '/* const x = 1; */',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Multi-line block comment with code
          {
            code: `/*
const a = 1;
const b = 2;
*/`,
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Multiple consecutive single-line comments that look like code
          {
            code: `// const x = 1;
// const y = 2;`,
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
        ],
      },
    );
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreSingleLine', noCommentedCode, {
      valid: [
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: true }],
        },
      ],
      invalid: [
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: false }],
          errors: [{
            messageId: 'commentedCode',
            suggestions: [{
              messageId: 'removeCode',
              output: '',
            }],
          }],
        },
      ],
    });

    ruleTester.run('options - minLines', noCommentedCode, {
      valid: [
        {
          code: '// const x = 1;',
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - ignoreInTests false', noCommentedCode, {
      valid: [],
      invalid: [
        {
          code: '// const x = 1;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{
            messageId: 'commentedCode',
            suggestions: [{
              messageId: 'removeCode',
              output: '',
            }],
          }],
        },
      ],
    });
  });
});
