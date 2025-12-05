/**
 * Tests for no-exposed-sensitive-data rule
 * Security: CWE-200 (Information Exposure)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExposedSensitiveData } from '../../rules/security/no-exposed-sensitive-data';

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

describe('no-exposed-sensitive-data', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe data handling', noExposedSensitiveData, {
      valid: [
        'console.log("Debug info");',
        'const data = getUserData();',
        'res.json({ message: "Success" });',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Sensitive Data Exposure', () => {
    ruleTester.run('invalid - sensitive data logging', noExposedSensitiveData, {
      valid: [],
      invalid: [
        // 2 errors: 1) "Password:" contains sensitive keyword (with suggestions), 2) password is sensitive variable (no suggestions)
        {
          code: 'console.log("Password:", password);',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              suggestions: [
                {
                  messageId: 'sanitizeData',
                  output: 'console.log("***REDACTED***", password);',
                },
              ],
            },
            { messageId: 'exposedSensitiveData' },
          ],
        },
        // 2 errors: 1) "User token:" contains sensitive keyword (with suggestions), 2) userToken is sensitive variable (no suggestions)
        {
          code: 'logger.info("User token:", userToken);',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              suggestions: [
                {
                  messageId: 'sanitizeData',
                  output: 'logger.info("***REDACTED***", userToken);',
                },
              ],
            },
            { messageId: 'exposedSensitiveData' },
          ],
        },
      ],
    });
  });
});
