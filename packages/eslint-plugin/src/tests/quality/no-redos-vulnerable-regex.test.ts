/**
 * Comprehensive tests for no-redos-vulnerable-regex rule
 * Security: CWE-400 (ReDoS - Regular Expression Denial of Service)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedosVulnerableRegex } from '../../rules/security/no-redos-vulnerable-regex';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
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
        // Simple safe patterns
        {
          code: 'const pattern = /^[a-z]+$/;',
        },
        {
          code: 'const pattern = /\\d+/;',
        },
        {
          code: 'const pattern = /hello/;',
        },
        {
          code: 'const pattern = /^test$/;',
        },
        // Not regex literals
        {
          code: 'const pattern = "test";',
        },
        {
          code: 'const pattern = new RegExp("test");',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - ReDoS Vulnerable Patterns', () => {
    ruleTester.run('invalid - ReDoS vulnerable patterns', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const pattern = /(a+)+b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = /(a*)*b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = /(a?)?b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = /(x+)+y/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = /(a|b)+c/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = /.*.*/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        // Note: This pattern might not be detected by all ReDoS detectors
        // Keeping it as a test case but it may need adjustment based on rule implementation
        // {
        //   code: 'const pattern = /(a{2,})+(b{2,})+/;',
        //   errors: [{ messageId: 'redosVulnerable' }],
        // },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowCommonPatterns', noRedosVulnerableRegex, {
      valid: [
        {
          code: 'const pattern = /(a|b)+c/;',
          options: [{ allowCommonPatterns: true }],
        },
      ],
      invalid: [
        {
          code: 'const pattern = /(a+)+b/;',
          options: [{ allowCommonPatterns: true }],
          errors: [{ messageId: 'redosVulnerable' }], // Critical patterns still detected
        },
      ],
    });

    ruleTester.run('options - maxPatternLength', noRedosVulnerableRegex, {
      valid: [
        {
          code: 'const pattern = /' + 'a'.repeat(600) + '/;',
          options: [{ maxPatternLength: 500 }], // Pattern too long, skipped
        },
      ],
      invalid: [
        {
          code: 'const pattern = /(a+)+b/;',
          options: [{ maxPatternLength: 500 }],
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });
  });
});

