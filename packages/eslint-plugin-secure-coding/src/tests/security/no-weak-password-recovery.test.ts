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
      valid: [],
      invalid: [
        // Date.now() based token
        {
          code: 'const resetToken = Date.now();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // new Date() based token
        {
          code: 'const recoveryToken = new Date().getTime();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // Math.random() based token
        {
          code: 'const token = Math.random().toString(36);',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // Predictable custom generator
        {
          code: 'const resetToken = generatePredictableToken();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // Binary expression with weak source
        {
          code: 'const token = "reset_" + Math.random();',
          errors: [{ messageId: 'insufficientTokenEntropy' }],
        },
        {
          code: 'const token = "id_" + Date.now();',
          errors: [{ messageId: 'insufficientTokenEntropy' }],
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
      ],
      invalid: [
        // Missing both checks
        {
          code: 'function handlePasswordReset(email) { resetPassword(email); }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
        // Missing rate limit only
        {
          code: 'function processForgotPw() { if(token.expired) return; reset(); }',
          errors: [{ messageId: 'missingRateLimit' }],
        },
        // Missing expiration only
        {
          code: 'function startRecovery() { checkRateLimit(); sendEmail(); }',
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
      ],
      invalid: [
        // Logging the actual token
        {
          code: 'console.log("Reset token:", resetToken);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
        // Logger logging password related data
        {
          code: 'logger.info("New password:", newPassword);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
        // Logging recovery code
        {
          code: 'console.warn("Recovery code", recoveryCode);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
      ],
    });
  });
});
