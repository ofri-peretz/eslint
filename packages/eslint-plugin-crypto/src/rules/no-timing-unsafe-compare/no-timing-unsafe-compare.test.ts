/**
 * Tests for no-timing-unsafe-compare rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-timing-unsafe-compare', () => {
  describe('Valid Code - Non-Secret Comparisons', () => {
    ruleTester.run('valid - false positive prevention', noTimingUnsafeCompare, {
      valid: [
        // Regular non-secret comparisons
        { code: 'if (name === otherName) {}' },
        { code: 'if (count === 5) {}' },
        { code: 'if (userId === targetId) {}' },
        { code: 'if (status === "active") {}' },
        { code: 'if (index === 0) {}' },
        // Similar names that are NOT secrets (use specific non-matching names)
        { code: 'if (role === "admin") {}' },
        { code: 'if (method === "oauth") {}' },
        { code: 'if (length === 8) {}' },
        // Non-comparison operators with secrets (should NOT flag)
        { code: 'if (token.length > 0) {}' },
        { code: 'if (secret.includes("prefix")) {}' },
        // Assignment (not comparison)
        { code: 'token = newToken;' },
        // Computed property access (not detected - intentional precision choice)
        { code: 'if (obj["access-token"] === expected) {}' },
        // Object keys (not values being compared)
        { code: 'const obj = { token: generateToken() };' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - All Comparison Operators', () => {
    ruleTester.run('invalid - strict equality', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // === operator
        { code: 'if (token === storedToken) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // == operator
        { code: 'if (secret == otherSecret) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // !== operator
        { code: 'if (apiKey !== expectedKey) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // != operator
        { code: 'if (password != userPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });

  describe('Invalid Code - All Secret Patterns', () => {
    ruleTester.run('invalid - comprehensive secret patterns', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // Tokens
        { code: 'if (token === storedToken) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (accessToken === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (refreshToken === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (bearerToken === auth) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (authToken === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Secrets
        { code: 'if (secret === otherSecret) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Keys
        { code: 'if (apiKey === expectedKey) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (privateKey === loaded) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (encryptionKey === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Passwords
        { code: 'if (password === userPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Hashes and MACs
        { code: 'if (hash === computed) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (hmac === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (digest === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (signature === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (mac === computed) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // PII
        { code: 'if (ssn === storedSSN) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Sessions
        { code: 'if (sessionId === current) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // CSRF
        { code: 'if (csrf === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (nonce === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // JWT
        { code: 'if (jwt === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Credentials
        { code: 'if (credential === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (bearer === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });

  describe('Invalid Code - Naming Conventions', () => {
    ruleTester.run('invalid - all naming conventions', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // camelCase
        { code: 'if (accessToken === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // snake_case
        { code: 'if (access_token === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // UPPER_CASE
        { code: 'if (API_KEY === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });

  describe('Invalid Code - Member Expressions', () => {
    ruleTester.run('invalid - member expressions', noTimingUnsafeCompare, {
      valid: [],
      invalid: [
        // Property access
        { code: 'if (user.password === inputPassword) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (req.headers.authorization === expected) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        { code: 'if (config.secret === stored) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
        // Deep nesting
        { code: 'if (app.config.auth.token === valid) {}', errors: [{ messageId: 'timingUnsafeCompare' }] },
      ],
    });
  });
});
