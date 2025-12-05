/**
 * Comprehensive tests for no-sensitive-data-exposure rule
 * Security: Detects PII/credentials in logs, responses, or error messages
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from '../../rules/security/no-sensitive-data-exposure';

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
});

