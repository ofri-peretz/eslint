/**
 * Comprehensive tests for no-insecure-cookie-settings rule
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureCookieSettings } from '../../rules/security/no-insecure-cookie-settings';

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
                  output: 'res.cookie("session", token, { httpOnly: true, sameSite: "strict",secure: true });',
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
                  output: 'res.cookie("session", token, { httpOnly: true, secure: true,sameSite: "strict" });',
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
});

