/**
 * Comprehensive tests for no-timing-attack rule
 * Security: CWE-208 (Timing Attack)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingAttack } from '../../rules/security/no-timing-attack';

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

describe('no-timing-attack', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure timing practices', noTimingAttack, {
      valid: [
        // Timing-safe comparisons
        {
          code: 'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));',
        },
        // Non-sensitive comparisons
        {
          code: 'if (user.name === "admin") return true;',
        },
        // Safe early returns in non-auth contexts
        {
          code: `
            function validateEmail(email) {
              if (!email) return false;
              return email.includes('@');
            }
          `,
        },
        // Timing-safe libraries
        {
          code: 'const bcrypt = require("bcrypt"); bcrypt.compare(password, hash);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Insecure Comparisons', () => {
    ruleTester.run('invalid - insecure string comparisons', noTimingAttack, {
      valid: [],
      invalid: [
        {
          code: 'if (userInput === storedPassword) authenticate();',
          errors: [
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
        {
          code: 'if (token == storedToken) return true;',
          errors: [
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
        {
          code: 'const isValid = providedSecret === actualSecret;',
          errors: [
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Early Return Leakage', () => {
    ruleTester.run('invalid - early returns in auth functions', noTimingAttack, {
      valid: [],
      invalid: [
        {
          code: `
            function authenticate(password) {
              if (!password) return false;
              return checkPassword(password);
            }
          `,
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
        {
          code: `
            function verifyToken(token) {
              if (!token) return false;
              return validateToken(token);
            }
          `,
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
        {
          code: `
            function login(credentials) {
              if (!credentials.password) return false;
              return authenticateUser(credentials);
            }
          `,
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Timing Attacks', () => {
    ruleTester.run('invalid - timing-sensitive operations', noTimingAttack, {
      valid: [],
      invalid: [
        {
          code: 'someObject.equals(userInput, storedSecret);',
          errors: [
            {
              messageId: 'timingAttack',
            },
          ],
        },
        {
          code: 'password.compare(inputPassword);',
          errors: [
            {
              messageId: 'timingAttack',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noTimingAttack, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @timing-safe */
            if (userInput === storedPassword) authenticate();
          `,
        },
        // Sanitized inputs
        {
          code: `
            const cleanInput = sanitize(userInput);
            if (cleanInput === storedPassword) authenticate();
          `,
        },
        // Non-sensitive data
        {
          code: `
            const user = { name: 'john' };
            if (user.name === 'admin') return true;
          `,
        },
        // Early returns allowed in config
        {
          code: `
            function authenticate(password) {
              if (!password) return false;
              return checkPassword(password);
            }
          `,
          options: [{ allowEarlyReturns: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom auth functions', noTimingAttack, {
      valid: [
        // No valid cases - configured auth functions still get checked
      ],
      invalid: [
        {
          code: `
            function myAuth(password) {
              if (!password) return false;
              return true;
            }
          `,
          options: [{ authFunctions: ['myAuth'] }],
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
        {
          code: `
            function myAuth(password) {
              if (!password) return false;
              return true;
            }
          `,
          options: [{ authFunctions: ['differentAuth'] }],
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - custom sensitive variables', noTimingAttack, {
      valid: [
        // Valid cases would be comparisons that don't involve sensitive data
        {
          code: 'if (normalVar === otherVar) return true;',
          options: [{ sensitiveVariables: ['customToken'] }],
        },
      ],
      invalid: [
        {
          code: 'if (mySecret === otherSecret) return true;',
          options: [{ sensitiveVariables: ['mySecret'] }],
          errors: [
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
        {
          code: 'if (customToken === storedToken) return true;',
          options: [{ sensitiveVariables: ['customToken'] }],
          errors: [
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Authentication Scenarios', () => {
    ruleTester.run('complex - authentication functions', noTimingAttack, {
      valid: [],
      invalid: [
        {
          code: `
            function login(username, password) {
              const user = findUser(username);
              if (!user) return false; // Timing leak!

              if (user.password === password) {
                return true;
              }
              return false;
            }
          `,
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
            {
              messageId: 'insecureStringComparison',
            },
            {
              messageId: 'earlyReturnLeakage',
            },
          ],
        },
        {
          code: `
            function verifyToken(token) {
              if (!token || token.length < 10) return false; // Timing leak!

              const storedToken = getStoredToken();
              return token === storedToken; // Insecure comparison
            }
          `,
          errors: [
            {
              messageId: 'earlyReturnLeakage',
            },
            {
              messageId: 'insecureStringComparison',
            },
          ],
        },
      ],
    });
  });
});
