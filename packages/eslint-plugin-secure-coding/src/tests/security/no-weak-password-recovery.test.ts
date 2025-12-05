/**
 * Tests for no-weak-password-recovery rule
 * Security: CWE-640 (Weak Password Recovery Mechanism)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakPasswordRecovery } from '../../rules/security/no-weak-password-recovery';

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

describe('no-weak-password-recovery', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure password recovery', noWeakPasswordRecovery, {
      valid: [
        // Using crypto for secure random tokens
        'const resetToken = crypto.randomBytes(32).toString("hex");',
        'const recoveryToken = crypto.randomUUID();',
        // Regular code without password/reset keywords in sensitive contexts
        'function processData(data) { return data; }',
        'console.log("Application started");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Weak Recovery Mechanisms', () => {
    ruleTester.run('invalid - weak password recovery patterns', noWeakPasswordRecovery, {
      valid: [],
      invalid: [
        // Weak token generation using predictable values
        {
          code: 'const resetToken = Date.now() + Math.random();',
          errors: [
            {
              messageId: 'insufficientTokenEntropy',
            },
          ],
        },
        // Token based on timestamp and userId - insufficient entropy
        {
          code: 'const recoveryToken = timestamp + userId;',
          errors: [
            {
              messageId: 'insufficientTokenEntropy',
            },
          ],
        },
        // Password reset function triggers missing expiration and rate limit warnings
        {
          code: 'function resetPassword(email) { sendResetLink(email); }',
          errors: [
            {
              messageId: 'missingTokenExpiration',
            },
            {
              messageId: 'missingRateLimit',
            },
          ],
        },
        // Logging sensitive recovery data - reports 2 errors (for literal and identifier)
        {
          code: 'console.log("Reset token:", resetToken);',
          errors: [
            {
              messageId: 'recoveryLoggingSensitiveData',
            },
            {
              messageId: 'recoveryLoggingSensitiveData',
            },
          ],
        },
      ],
    });
  });
});
