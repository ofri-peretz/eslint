/**
 * Comprehensive tests for no-unescaped-url-parameter rule
 * CWE-79: Cross-site Scripting (XSS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnescapedUrlParameter } from '../rules/security/no-unescaped-url-parameter';

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
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-unescaped-url-parameter', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - escaped URL parameters', noUnescapedUrlParameter, {
      valid: [
        // Using encodeURIComponent
        {
          code: 'const url = `https://example.com?q=${encodeURIComponent(param)}`;',
        },
        {
          code: 'const url = "https://example.com?q=" + encodeURIComponent(param);',
        },
        // Using URLSearchParams
        {
          code: 'const params = new URLSearchParams({ q: param }); const url = `https://example.com?${params}`;',
        },
        // Using encodeURI
        {
          code: 'const url = `https://example.com/${encodeURI(path)}`;',
        },
        // Test files (when allowInTests is true)
        {
          code: 'const url = `https://example.com?q=${param}`;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'const url = `https://example.com?q=${safeParam}`;',
          options: [{ ignorePatterns: ['safeParam'] }],
        },
        // Non-URL strings
        {
          code: 'const message = `Hello ${name}`;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Template Literals', () => {
    ruleTester.run('invalid - unescaped in template literal', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const url = `https://example.com?q=${req.query.q}`;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
        {
          code: 'const url = `https://example.com?search=${userInput}`;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
        {
          code: 'const url = `https://example.com?id=${req.params.id}`;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - String Concatenation', () => {
    ruleTester.run('invalid - unescaped in string concatenation', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const url = "https://example.com?q=" + req.query.q;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
        {
          code: 'const url = "https://example.com?search=" + userInput;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = `https://example.com?q=${param}`;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'const url = `https://example.com?q=${param}`;',
          filename: 'handler.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns with invalid regex', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = `https://example.com?q=${testParam}`;',
          options: [{ ignorePatterns: ['['] }], // Invalid regex should be caught
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - trustedLibraries', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = `https://example.com?q=${myLib.encode(param)}`;',
          options: [{ trustedLibraries: ['myLib'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - non-URL template literals', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const message = `Hello ${name}`;',
        },
        {
          code: 'const path = `/users/${id}`;',
        },
        {
          code: 'const file = `./${filename}.txt`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - binary expression with literal', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = "https://example.com?q=" + "test";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - already encoded in template', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = `https://example.com?q=${encodeURIComponent(req.query.q)}`;',
        },
        {
          code: 'const url = `https://example.com?q=${encodeURI(path)}`;',
        },
        {
          code: 'const url = `https://example.com?q=${escape(input)}`;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - already encoded in binary', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const url = "https://example.com?q=" + encodeURIComponent(req.query.q);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - different URL patterns', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const url = new URL(`https://example.com?q=${req.query.q}`);',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
        {
          code: 'window.location.href = `https://example.com?q=${userInput}`;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
        {
          code: 'window.open(`https://example.com?q=${input}`);',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - searchParams pattern', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const url = `https://example.com?q=${searchParams.get("id")}`;',
          errors: [
            {
              messageId: 'unescapedUrlParameter',
            },
          ],
        },
      ],
    });
  });
});

