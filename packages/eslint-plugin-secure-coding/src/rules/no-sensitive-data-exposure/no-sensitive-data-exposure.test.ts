/**
 * Comprehensive tests for no-sensitive-data-exposure rule
 * Security: Detects PII/credentials in logs, responses, or error messages
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noSensitiveDataExposure } from './index';

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

describe('no-sensitive-data-exposure', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no sensitive data', noSensitiveDataExposure, {
      valid: [
        // Regular log messages
        {
          code: `console.log('User logged in');`,
        },
        {
          code: `console.log('Hello world');`,
        },
        // Logger methods without sensitive data
        {
          code: `logger.info('Request received');`,
        },
        {
          code: `logger.error('Operation failed');`,
        },
        {
          code: `logger.debug('Processing started');`,
        },
        // Errors without sensitive data
        {
          code: `throw new Error('Operation failed');`,
        },
        {
          code: `new Error('Invalid input');`,
        },
        // Variables with sensitive names not in logs
        {
          code: `const password = process.env.PASSWORD;`,
        },
        // Non-logging function calls with sensitive data (not flagged)
        {
          code: `processData('password value');`,
        },
        {
          code: `fetch('https://api.example.com?token=abc');`,
        },
        // Member expression that's not console/logger
        {
          code: `validator.check('password field');`,
        },
        // Custom patterns - not matching
        {
          code: `console.log('Password:', password);`,
          options: [{ sensitivePatterns: ['secret'] }],
        },
        // Disabled checks
        {
          code: `console.log('password is:', pwd);`,
          options: [{ checkConsoleLog: false }],
        },
        {
          code: `throw new Error('password error');`,
          options: [{ checkErrorMessages: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Console Log', () => {
    ruleTester.run('invalid - console.log with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // String literal with password
        {
          code: `console.log('password: 123456');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with token
        {
          code: `console.log('API token: abc123');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with key
        {
          code: `console.log('secret key value');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with SSN
        {
          code: `console.log('SSN: 123-45-6789');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with credit
        {
          code: `console.log('credit card number');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with password in name
        {
          code: `console.log(userPassword);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with token in name
        {
          code: `console.log(apiToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with key in name
        {
          code: `console.log(secretKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Logger Methods', () => {
    ruleTester.run('invalid - logger with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // logger.info
        {
          code: `logger.info('password exposed');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.warn
        {
          code: `logger.warn('api_key: xyz');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.error
        {
          code: `logger.error('token invalid');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.debug with identifier
        {
          code: `logger.debug(password);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.warn
        {
          code: `console.warn('secret exposed');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.error
        {
          code: `console.error('apikey error');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.debug
        {
          code: `console.debug(apiKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.trace
        {
          code: `console.trace('token trace');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Identifier-based Logging', () => {
    ruleTester.run('invalid - log() function with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // Direct log() function call
        {
          code: `log('password: 123');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // customLogger() function
        {
          code: `customLogger('token exposed');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Error Messages', () => {
    ruleTester.run('invalid - Error with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // String literal with password
        {
          code: `throw new Error('password is invalid');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with token
        {
          code: `new Error('token expired');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with secret
        {
          code: `throw new Error('secret not found');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with sensitive left side
        {
          code: `throw new Error('password: ' + value);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with sensitive right identifier
        {
          code: `throw new Error('Error: ' + userPassword);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with token identifier
        {
          code: `throw new Error('Invalid ' + apiToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with key identifier
        {
          code: `throw new Error('Missing ' + secretKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Options - Custom Patterns', () => {
    ruleTester.run('options - custom sensitive patterns', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // Custom pattern: email
        {
          code: `console.log('user email: test@example.com');`,
          options: [{ sensitivePatterns: ['email'] }],
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Custom pattern: phone
        {
          code: `logger.info('phone number logged');`,
          options: [{ sensitivePatterns: ['phone'] }],
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('isLoggingCall - MemberExpression branch permutations', () => {
    ruleTester.run('valid - computed member call (property is not an Identifier) is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of `property.type === 'Identifier'`:
        // a computed member call like console['log'](...) has a Literal
        // property, not an Identifier.
        {
          code: `console['log']('password: 123456');`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - non-Identifier object with a log-like method name is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of `object.type === 'Identifier'`: the
        // method name matches ("info") but the object itself is a nested
        // MemberExpression, not a bare Identifier.
        {
          code: `app.logger.info('password: 123456');`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - Identifier object with a name other than console or logger is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of `objName === 'console' || objName === 'logger'`.
        {
          code: `myThing.log('password: 123456');`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - non-MemberExpression, non-Identifier callee is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the case where node.callee is neither a MemberExpression
        // nor an Identifier (a CallExpression callee via IIFE-style call).
        {
          code: `(getLogger())('password: 123456');`,
        },
      ],
      invalid: [],
    });
  });

  describe('Error argument shapes that are not flagged', () => {
    ruleTester.run('valid - Error thrown with a non-"+" BinaryExpression argument is not flagged', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of `arg.operator === '+'`.
        {
          code: `throw new Error('code: ' - 1);`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - Error with a plus BinaryExpression but no matching literal or identifier sides is not flagged', noSensitiveDataExposure, {
      valid: [
        // Left side is a non-string literal (number), right side is a
        // non-matching identifier: neither the left-literal nor
        // right-identifier sensitive-data branches fire.
        {
          code: `throw new Error(1 + count);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Layer 2 - synthetic nodes and defensive fallbacks (mock context)', () => {
    it('falls back to {} when the options entry itself is null (options || {} branch)', () => {
      // `[options = {}]` only substitutes the default for `undefined`, not
      // `null` — the inner `options || {}` handles an explicit null entry,
      // which a real parser/RuleTester options array cannot produce (schema
      // validation rejects `null` for an object-typed option), so this is
      // exercised directly against a mock context with `options: [null]`.
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [null],
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
        },
        arguments: [{ type: 'Literal', value: 'password: 123456' }],
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      // With options falling back to {}, the default sensitivePatterns list
      // still applies and checkConsoleLog still defaults to true, so the
      // sensitive literal argument is still reported.
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('sensitiveDataExposure');
    });

    it('skips an Identifier argument with an empty name (arg.name truthiness branch)', () => {
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [{}],
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
        },
        // A synthetic Identifier with an empty `name` — unproducable by any
        // real parser, but exercises the `&& arg.name` truthiness guard.
        arguments: [{ type: 'Identifier', name: '' }],
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(0);
    });

    it('skips a "+" BinaryExpression Error argument with no right-hand side (arg.right truthiness branch)', () => {
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [{}],
      });

      const node = {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Error' },
        // A synthetic "+" BinaryExpression with no `right` operand at all —
        // unproducable by any real parser, but exercises the `arg.right &&`
        // truthiness guard ahead of the Identifier/name checks.
        arguments: [
          {
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'Literal', value: 'ok' },
            right: undefined,
          },
        ],
      };

      (listeners['NewExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(0);
    });

    it('skips a NewExpression with no callee (node.callee truthiness branch)', () => {
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [{}],
      });

      const node = {
        type: 'NewExpression',
        // A synthetic NewExpression with no callee at all — unproducable by
        // any real parser (`new` always has a callee), but exercises the
        // `node.callee &&` truthiness guard.
        callee: undefined,
        arguments: [{ type: 'Literal', value: 'password leaked' }],
      };

      (listeners['NewExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(0);
    });
  });

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_proto_allowlist - Invalid key error', noSensitiveDataExposure, {
      valid: [
        // "Invalid key" in error messages is NOT sensitive data exposure
        // The word "key" here refers to an object property key, not an API key
        {
          code: `
            function validateKey(obj, key, value) {
              const VALID_KEYS = ['name', 'email', 'age', 'status'];
              if (!VALID_KEYS.includes(key)) {
                throw new Error('Invalid key');
              }
              obj[key] = value;
            }
          `,
        },
        // Generic "key" usage in error context should not trigger
        {
          code: `throw new Error('Invalid key format');`,
        },
        // "key" as a standalone word in non-sensitive context
        {
          code: `console.log('Press any key to continue');`,
        },
      ],
      invalid: [],
    });
  });
});
