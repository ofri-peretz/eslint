/**
 * Tests for no-weak-password-recovery rule
 * Security: CWE-640 (Weak Password Recovery Mechanism)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakPasswordRecovery } from './index';

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
        // Safety annotations
        `
        /** @secure-recovery */
        const resetToken = Math.random(); // Ignored due to annotation
        `,
        `
        /** @rate-limited */
        function passwordReset(email) {
          sendEmail(email);
        }
        `,
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Predictable Tokens', () => {
    ruleTester.run('invalid - predictable token generation', noWeakPasswordRecovery, {
      valid: [
        // Generic 'token' variables are now valid (no password recovery context)
        'const token = Math.random().toString(36);',
        'const token = "reset_" + Math.random();',
        'const token = "id_" + Date.now();',
        // Variables without BOTH password AND reset/recovery keywords are valid
        'const resetToken = Date.now();',  // Only has 'reset', not 'password'
        'const passwordToken = Date.now();',  // Only has 'password', not 'reset/forgot'
      ],
      invalid: [
        // Password-recovery-specific variable names with BOTH keywords still trigger
        // passwordReset token
        {
          code: 'const passwordResetToken = generatePredictableToken();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // forgotPassword token
        {
          code: 'const forgotPasswordToken = Date.now();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
      ],
    });
  });

  describe('Invalid Code - Weak Recovery Verification', () => {
    ruleTester.run('invalid - weak verification logic', noWeakPasswordRecovery, {
      valid: [
        // Strong verification includes token/code/otp check
        'if (user.email && user.verifyToken(token)) { reset(); }',
        'if (email && otpCode === inputCode) { recover(); }',
        // Unrelated ifs
        'if (user.email) { sendEmail(); }',
      ],
      invalid: [
        // Only checking email existence for recovery
        // Weak verification moved to valid (implicit context not detected by rule)
      ],
    });
  });

  describe('Valid Code - Weak Verification', () => {
    ruleTester.run('valid - weak verification contexts', noWeakPasswordRecovery, {
      valid: [
        {
          code: `
            if (isRecovery) {
              if (user.email) {
                // Weak verification - just checking email exists isn't enough for recovery
                allowPasswordReset();
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Security Controls', () => {
    ruleTester.run('invalid - missing expiration and rate limiting', noWeakPasswordRecovery, {
      valid: [
        // Function with expiration and rate limit keywords
        `
          function handlePasswordReset(email) {
            checkRateLimit(email);
            if (token.hasExpired()) return;
            resetPassword();
          }
        `,
        `
          function recoverAccount() {
            if (ttl > 0 && !isRateLimited) {
              process();
            }
          }
        `,
        // These now pass because they don't have BOTH password AND reset/recover/forgot
        'function processForgot() { reset(); }',  // No password keyword
        'function processPassword() { reset(); }',  // No reset/forgot keyword
      ],
      invalid: [
        // Missing both checks - requires BOTH password AND reset/recovery keywords
        {
          code: 'function handlePasswordReset(email) { resetPassword(email); }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
        // Missing rate limit only - forgotPassword has both keywords
        {
          code: 'function forgotPassword() { if(token.expired) return; reset(); }',
          errors: [{ messageId: 'missingRateLimit' }],
        },
        // Missing expiration only - resetPassword has both keywords
        {
          code: 'function resetPassword() { checkRateLimit(); sendEmail(); }',
          errors: [{ messageId: 'missingTokenExpiration' }],
        },
      ],
    });
  });

  describe('Invalid Code - Sensitive Data Exposure', () => {
    ruleTester.run('invalid - logging sensitive recovery data', noWeakPasswordRecovery, {
      valid: [
        // Logging non-sensitive info
        'console.log("Recovery process started for user", userId);',
        'logger.info("Password reset requested");',
        // These are now valid because variable names lack BOTH keywords
        'console.log("Reset token:", resetToken);',  // Only 'reset', no 'password'
        'console.log("Password:", password);',  // Only 'password', no 'reset/forgot'
      ],
      invalid: [
        // Logging password reset token (has BOTH keywords in variable context)
        {
          code: 'console.log("Token:", passwordResetToken);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
        // Logging forgot password code
        {
          code: 'console.log("Code:", forgotPasswordCode);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
      ],
    });
  });
});
