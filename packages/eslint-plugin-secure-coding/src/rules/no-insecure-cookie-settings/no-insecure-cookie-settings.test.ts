/**
 * Comprehensive tests for no-insecure-cookie-settings rule
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureCookieSettings } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

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

describe('no-insecure-cookie-settings', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure cookie settings', noInsecureCookieSettings, {
      valid: [
        // Secure cookie with all flags
        {
          code: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });',
        },
        {
          code: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "lax" });',
        },
        {
          code: 'cookie.set("session", token, { httpOnly: true, secure: true, sameSite: "none" });',
        },
        // Cookie options object with all flags
        {
          code: `
            const options = {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              maxAge: 3600000
            };
            res.cookie("session", token, options);
          `,
        },
        // Test files (when allowInTests is true)
        {
          code: 'res.cookie("test", "value", {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Flags', () => {
    ruleTester.run('invalid - missing httpOnly', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        {
          code: 'res.cookie("session", token, { secure: true, sameSite: "strict" });',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing httpOnly flag',
                safeAlternative: 'Set httpOnly: true, secure: true, sameSite: "strict"',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { secure: true, sameSite: "strict",\n  httpOnly: true });',
                },
              ],
            },
          ],
        },
        {
          code: 'res.cookie("session", token, { secure: true });',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing httpOnly flag, missing sameSite flag',
                safeAlternative: 'Set httpOnly: true, secure: true, sameSite: "strict"',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { secure: true,\n  httpOnly: true,\n  sameSite: "strict" });',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - missing secure', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        {
          code: 'res.cookie("session", token, { httpOnly: true, sameSite: "strict" });',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing secure flag',
                safeAlternative: 'Set httpOnly: true, secure: true, sameSite: "strict"',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { httpOnly: true, sameSite: "strict",\n  secure: true });',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - missing sameSite', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        {
          code: 'res.cookie("session", token, { httpOnly: true, secure: true });',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing sameSite flag',
                safeAlternative: 'Set httpOnly: true, secure: true, sameSite: "strict"',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { httpOnly: true, secure: true,\n  sameSite: "strict" });',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - missing all flags', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        {
          code: 'res.cookie("session", token, {});',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing httpOnly flag, missing secure flag, missing sameSite flag',
                safeAlternative: 'Set httpOnly: true, secure: true, sameSite: "strict"',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });',
                },
              ],
            },
          ],
        },
        {
          code: 'res.cookie("session", token);',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'missing cookie options with httpOnly, secure, and sameSite flags',
                safeAlternative: 'Add options object: res.cookie(name, value, { httpOnly: true, secure: true, sameSite: "strict" })',
              },
              suggestions: [
                {
                  messageId: 'addSecureFlags',
                  output: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - document.cookie', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        {
          code: 'document.cookie = "session=token";',
          errors: [
            {
              messageId: 'insecureCookieSettings',
              data: {
                issue: 'using document.cookie directly (cannot set httpOnly flag)',
                safeAlternative: 'Use server-side cookie setting with httpOnly: true, secure: true, sameSite: "strict"',
              },
            },
          ],
        },
      ],
    });
  });
  describe('Configuration Options', () => {
    ruleTester.run('config - ignore patterns', noInsecureCookieSettings, {
      valid: [
        // Ignored cookie names
        {
          code: 'res.cookie("ignored-session", token, { path: "/" });',
          options: [{ ignorePatterns: ['ignored-session'] }],
        },
        // Ignored via regex
        {
          code: 'res.cookie("analytics_id", id, { path: "/" });',
          options: [{ ignorePatterns: ['analytics_.*'] }],
        },
        // Invalid regex in ignore patterns handles gracefully
        {
          code: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });',
          options: [{ ignorePatterns: ['['] }],
        },
      ],
      invalid: [
        // Not ignored
        {
          code: 'res.cookie("session", token, { path: "/" });',
          options: [{ ignorePatterns: ['other'] }],
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { path: "/",\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
      ],
    });

    ruleTester.run('config - test files', noInsecureCookieSettings, {
      valid: [
        {
          code: 'res.cookie("test", "value", {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'res.cookie("test", "value", {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: false }],
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("test", "value", { httpOnly: true, secure: true, sameSite: "strict" });'
               }]
            }
          ],
        },
      ],
    });
  });

  describe('Complex Fixer Scenarios', () => {
    ruleTester.run('fixer - comma handling', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        // Property without trailing comma
        {
          code: 'res.cookie("session", token, { path: "/" });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { path: "/",\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
        // Property with trailing comma
        {
          code: 'res.cookie("session", token, { path: "/", });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { path: "/",\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict", });'
               }]
            }
          ],
        },
        // Mixed flags present (missing some)
        {
          code: 'res.cookie("session", token, { httpOnly: true });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
        {
          code: 'res.cookie("session", token, { secure: true });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { secure: true,\n  httpOnly: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
      ],
    });
  });

  describe('Nested and Indirect Configurations', () => {
    ruleTester.run('indirect - cookie options referencing', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        // Object defined elsewhere but passed as argument
        // Note: The rule currently only checks inline objects or certain patterns
        // This test ensures we're checking call arguments that are ObjectExpressions
        {
          code: 'res.cookie("session", token, { maxAge: 1000 });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", token, { maxAge: 1000,\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
        // Object nested in another call
        {
          code: 'res.cookie("session", generateToken(), { maxAge: 1000 });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'res.cookie("session", generateToken(), { maxAge: 1000,\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
      ],
    });
  });

  describe('Other Library Patterns', () => {
    ruleTester.run('libraries - other cookie setters', noInsecureCookieSettings, {
      valid: [],
      invalid: [
        // cookie-session style
        {
          code: 'cookie.set("session", value, { path: "/" });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'cookie.set("session", value, { path: "/",\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
        // Universal cookie
        {
          code: 'cookies.set("session", value, { path: "/" });',
          errors: [
            {
               messageId: 'insecureCookieSettings',
               suggestions: [{
                 messageId: 'addSecureFlags',
                 output: 'cookies.set("session", value, { path: "/",\n  httpOnly: true,\n  secure: true,\n  sameSite: "strict" });'
               }]
            }
          ],
        },
      ],
    });
  });
});

