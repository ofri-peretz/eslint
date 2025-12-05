/**
 * Comprehensive tests for no-insufficient-random rule
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsufficientRandom } from '../../rules/security/no-insufficient-random';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-insufficient-random', () => {
  ruleTester.run('no-insufficient-random', noInsufficientRandom, {
    valid: [
      // Valid: crypto.getRandomValues()
      {
        code: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);',
      },
      {
        code: 'const bytes = crypto.randomBytes(16);',
      },
      {
        code: 'const random = crypto.getRandomValues(new Uint8Array(10));',
      },
      // Valid: Non-random code
      {
        code: 'const value = Math.floor(5);',
      },
      {
        code: 'const text = "Math.random() is weak";',
      },
      {
        code: 'function random() { return 42; }',
      },
      // Valid: Test files (if allowInTests is true)
      {
        code: 'const random = Math.random();',
        filename: 'test.spec.ts',
        options: [{ allowInTests: true }],
      },
      {
        code: 'const random = Math.random();',
        filename: 'test.test.ts',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      // Invalid: Math.random()
      {
        code: 'const random = Math.random();',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);',
              },
            ],
          },
        ],
      },
      {
        code: 'const value = Math.random() * 100;',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const value = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) * 100;',
              },
            ],
          },
        ],
      },
      {
        code: 'function getRandom() { return Math.random(); }',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'function getRandom() { return crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1); }',
              },
            ],
          },
        ],
      },
      {
        code: 'const id = Math.random().toString(36).substring(2);',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const id = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1).toString(36).substring(2);',
              },
            ],
          },
        ],
      },
      // Invalid: Math.random() in different contexts
      {
        code: 'if (Math.random() > 0.5) { console.log("heads"); }',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'if (crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) > 0.5) { console.log("heads"); }',
              },
            ],
          },
        ],
      },
      {
        code: 'const arr = [1, 2, 3].sort(() => Math.random() - 0.5);',
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const arr = [1, 2, 3].sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1) - 0.5);',
              },
            ],
          },
        ],
      },
      // Invalid: Math.random() in test files (if allowInTests is false)
      {
        code: 'const random = Math.random();',
        filename: 'test.spec.ts',
        options: [{ allowInTests: false }],
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);',
              },
            ],
          },
        ],
      },
    ],
  });

  // Test options
  ruleTester.run('no-insufficient-random with options', noInsufficientRandom, {
    valid: [
      {
        code: 'const random = Math.random();',
        filename: 'test.spec.ts',
        options: [{ allowInTests: true }],
      },
      {
        code: 'const random = Math.random();',
        filename: 'test.test.ts',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      {
        code: 'const random = Math.random();',
        filename: 'src/index.ts',
        options: [{ allowInTests: true }],
        errors: [
          {
            messageId: 'insufficientRandom',
            suggestions: [
              {
                messageId: 'useCryptoRandomValues',
                output: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);',
              },
            ],
          },
        ],
      },
    ],
  });

  // Test additionalWeakPatterns option
  ruleTester.run('no-insufficient-random with additionalWeakPatterns', noInsufficientRandom, {
    valid: [],
    invalid: [
      {
        code: 'const random = weakRandom();',
        options: [{ additionalWeakPatterns: ['weakRandom'] }],
        errors: [
          {
            messageId: 'insufficientRandom',
            // Custom patterns provide suggestions but no auto-fix
            // RuleTester filters suggestions where fix returns null
          },
        ],
      },
      {
        code: 'const value = customRandom();',
        options: [{ additionalWeakPatterns: ['customRandom'] }],
        errors: [
          {
            messageId: 'insufficientRandom',
            // Custom patterns provide suggestions but no auto-fix
            // RuleTester filters suggestions where fix returns null
          },
        ],
      },
      {
        code: 'const id = myRandom();',
        options: [{ additionalWeakPatterns: ['myRandom'] }],
        errors: [
          {
            messageId: 'insufficientRandom',
            // Custom patterns provide suggestions but no auto-fix
            // RuleTester filters suggestions where fix returns null
          },
        ],
      },
    ],
  });
});

