/**
 * Comprehensive tests for no-document-cookie rule
 * Prevent direct usage of document.cookie
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDocumentCookie } from '../rules/security/no-document-cookie';

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

describe('no-document-cookie', () => {
  describe('basic functionality', () => {
    ruleTester.run('prevent document.cookie usage', noDocumentCookie, {
      valid: [
        // Other document properties
        {
          code: 'document.title = "New Title";',
        },
        {
          code: 'const url = document.URL;',
        },
        {
          code: 'document.body.appendChild(element);',
        },
        // Other objects with cookie property
        {
          code: 'response.cookie = "value";',
        },
        {
          code: 'const cookie = req.cookies;',
        },
        // Cookie Store API usage (recommended)
        {
          code: 'await cookieStore.set("name", "value");',
        },
        {
          code: 'const cookies = await cookieStore.getAll();',
        },
        // Cookie libraries
        {
          code: 'Cookies.set("name", "value");',
        },
        {
          code: 'const value = Cookies.get("name");',
        },
        // Reading document.cookie (allowed by default)
        {
          code: 'const cookies = document.cookie;',
        },
        {
          code: 'console.log(document.cookie);',
        },
        {
          code: 'const parsed = document.cookie.split("; ");',
        },
      ],
      invalid: [
        // Direct assignment
        {
          code: 'document.cookie = "name=value";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Compound assignment
        {
          code: 'document.cookie += "; name=value";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });

  describe('allowReading option', () => {
    ruleTester.run('allowReading option', noDocumentCookie, {
      valid: [
        // Reading is allowed by default
        {
          code: 'const cookies = document.cookie;',
          options: [{ allowReading: true }],
        },
        {
          code: 'console.log(document.cookie);',
          options: [{ allowReading: true }],
        },
        {
          code: 'const parsed = document.cookie.split("; ");',
          options: [{ allowReading: true }],
        },
      ],
      invalid: [
        // Assignments are still flagged
        {
          code: 'document.cookie = "name=value";',
          options: [{ allowReading: true }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Reading is not allowed when disabled
        {
          code: 'const cookies = document.cookie;',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });

  describe('complex expressions', () => {
    ruleTester.run('complex expressions', noDocumentCookie, {
      valid: [],
      invalid: [
        // In function calls
        {
          code: 'setCookie(document.cookie);',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In ternary expressions
        {
          code: 'const value = condition ? document.cookie : "default";',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In template literals
        {
          code: 'console.log(`Cookies: ${document.cookie}`);',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Chained method calls
        {
          code: 'document.cookie.split(";").forEach(cookie => console.log(cookie));',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Optional chaining
        {
          code: 'const cookies = document?.cookie;',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', noDocumentCookie, {
      valid: [],
      invalid: [
        // In function
        {
          code: `
            function getCookies() {
              return document.cookie;
            }
          `,
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In class method
        {
          code: `
            class CookieManager {
              getAll() {
                document.cookie = "test=value";
                return document.cookie;
              }
            }
          `,
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In arrow function
        {
          code: 'const getCookie = () => document.cookie;',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In async function
        {
          code: `
            async function setCookie(name, value) {
              document.cookie = \`\${name}=\${value}\`;
            }
          `,
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // In conditional
        {
          code: `
            if (typeof document !== 'undefined') {
              document.cookie += "; path=/";
            }
          `,
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', noDocumentCookie, {
      valid: [
        // Shadowed document variable
        {
          code: `
            const document = { cookie: "fake" };
            console.log(document.cookie);
          `,
        },
        // Different property names
        {
          code: 'document.cookies = "value";',
        },
        {
          code: 'const value = document.cookieValue;',
        },
      ],
      invalid: [
        // Computed property access
        {
          code: 'document["cookie"] = "value";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Variable assignment
        {
          code: 'let cookie = document.cookie;',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Const assignment
        {
          code: 'const cookieString = document.cookie;',
          options: [{ allowReading: false }],
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });

  describe('assignment detection', () => {
    ruleTester.run('assignment detection', noDocumentCookie, {
      valid: [],
      invalid: [
        // Direct assignment
        {
          code: 'document.cookie = "session=abc123";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Assignment with path
        {
          code: 'document.cookie = "name=value; path=/";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Compound assignment
        {
          code: 'document.cookie += "; secure";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Assignment with expiration
        {
          code: 'document.cookie = "user=john; expires=Fri, 31 Dec 9999 23:59:59 GMT";',
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
        // Multiple assignments
        {
          code: `
            document.cookie = "first=value1";
            document.cookie = "second=value2";
          `,
          errors: [
            {
              messageId: 'noDocumentCookie',
            },
            {
              messageId: 'noDocumentCookie',
            },
          ],
        },
      ],
    });
  });
});
