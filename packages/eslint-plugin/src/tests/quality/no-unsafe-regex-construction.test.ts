/**
 * Comprehensive tests for no-unsafe-regex-construction rule
 * Security: CWE-400 (ReDoS - Regular Expression Denial of Service)
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

// Use Flat Config format (ESLint 9+)
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
        // Literal strings (if allowLiterals is true)
        {
          code: 'const pattern = new RegExp("test");',
          options: [{ allowLiterals: true }],
        },
        {
          code: 'const pattern = RegExp("safe");',
          options: [{ allowLiterals: true }],
        },
        // Escaped user input
        {
          code: `
            function escapeRegex(str) {
              return str.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
            }
            const pattern = new RegExp(escapeRegex(userInput));
          `,
        },
        // Not RegExp constructor
        {
          code: 'const pattern = myFunction(userInput);',
        },
        {
          code: 'obj.RegExp(userInput);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - User Input Without Escaping', () => {
    ruleTester.run('invalid - user input in regex', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        {
          code: 'const pattern = new RegExp(userInput);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: 'const pattern = RegExp(userPattern);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: 'const pattern = new RegExp(`^${userInput}$`);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: `
            const pattern = getUserInput();
            const regex = new RegExp(pattern);
          `,
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: 'new RegExp(config.pattern);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        {
          code: 'new RegExp(req.body.pattern);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Dynamic Flags', () => {
    // Note: With allowLiterals=true (default), the rule returns early for literal patterns
    // and doesn't check dynamic flags. This is by design - literal patterns are safe.
    ruleTester.run('dynamic flags with literal pattern', noUnsafeRegexConstruction, {
      valid: [
        // With literal pattern and allowLiterals=true (default), rule skips dynamic flags check
        {
          code: 'new RegExp("test", userFlags);',
          options: [{ allowLiterals: true }],
        },
        {
          code: 'new RegExp("test", getFlags());',
          options: [{ allowLiterals: true }],
        },
        {
          code: 'new RegExp("test", config.flags);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Dynamic flags are only checked when pattern is user input
        {
          code: 'new RegExp(userInput, userFlags);',
          errors: [{ messageId: 'unsafeRegexConstruction' }, { messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Invalid Code - Long Literal Patterns', () => {
    ruleTester.run('invalid - pattern too long', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        {
          code: `const pattern = new RegExp("${'a'.repeat(150)}");`,
          options: [{ maxPatternLength: 100 }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowLiterals', noUnsafeRegexConstruction, {
      valid: [
        {
          code: 'const pattern = new RegExp("test");',
          options: [{ allowLiterals: true }],
        },
        {
          code: 'const pattern = RegExp("safe");',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'const pattern = new RegExp(userInput);',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'unsafeRegexConstruction' }], // Still detects user input
        },
      ],
    });

    ruleTester.run('options - trustedEscapingFunctions', noUnsafeRegexConstruction, {
      valid: [
        {
          code: `
            function escapeRegex(str) {
              return str.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
            }
            const pattern = new RegExp(escapeRegex(userInput));
          `,
          options: [{ trustedEscapingFunctions: ['escapeRegex'] }],
        },
      ],
      invalid: [
        {
          code: 'const pattern = new RegExp(userInput);',
          options: [{ trustedEscapingFunctions: ['escapeRegex'] }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });

    ruleTester.run('options - maxPatternLength', noUnsafeRegexConstruction, {
      valid: [
        {
          code: `const pattern = new RegExp("${'a'.repeat(50)}");`,
          options: [{ allowLiterals: true, maxPatternLength: 100 }],
        },
      ],
      invalid: [
        {
          code: `const pattern = new RegExp("${'a'.repeat(150)}");`,
          options: [{ allowLiterals: true, maxPatternLength: 100 }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });
});

