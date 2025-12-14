/**
 * Tests for no-redos-vulnerable-regex rule
 * Security: CWE-400 (Uncontrolled Resource Consumption - ReDoS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedosVulnerableRegex } from './index';

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

describe('no-redos-vulnerable-regex', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex patterns', noRedosVulnerableRegex, {
      valid: [
        'const regex = /^[a-z]+$/;',
        'const emailRegex = /^[^@]+@[^@]+$/;',
        'new RegExp("^[0-9]+$");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - ReDoS Vulnerable Patterns', () => {
    ruleTester.run('invalid - vulnerable regex patterns', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a+)+b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = new RegExp("(x+)+y");',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });
  });

  describe('Options Coverage', () => {
    ruleTester.run('options - allowCommonPatterns bypasses alternation', noRedosVulnerableRegex, {
      valid: [
        {
          code: 'const regex = /(a|b)+c/;',
          options: [{ allowCommonPatterns: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - maxPatternLength skips overly long patterns', noRedosVulnerableRegex, {
      valid: [
        {
          code: `const regex = /${'a'.repeat(600)}+/;`,
          options: [{ maxPatternLength: 100 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - RegExp call expression', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'RegExp("(a+)+b");',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });
  });
});
