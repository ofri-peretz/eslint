/**
 * Comprehensive tests for no-unsanitized-html rule
 * CWE-79: Cross-site Scripting (XSS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsanitizedHtml } from '../../rules/security/no-unsanitized-html';

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

describe('no-unsanitized-html', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - sanitized HTML', noUnsanitizedHtml, {
      valid: [
        // Using textContent
        {
          code: 'element.textContent = userInput;',
        },
        // Sanitized with DOMPurify
        {
          code: 'element.innerHTML = DOMPurify.sanitize(html);',
        },
        {
          code: '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />',
        },
        // Sanitized with sanitize-html
        {
          code: 'element.innerHTML = sanitizeHtml(userInput);',
        },
        // Test files (when allowInTests is true)
        {
          code: 'element.innerHTML = userInput;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'safeElement.innerHTML = safeHtml;',
          options: [{ ignorePatterns: ['safeElement'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - innerHTML', () => {
    ruleTester.run('invalid - unsanitized innerHTML', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: 'element.innerHTML = userInput;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = userInput;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
                // because fix returns null (suggestions are not auto-fixable)
              ],
            },
          ],
        },
        {
          code: 'document.getElementById("container").innerHTML = html;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'document.getElementById("container").textContent = html;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
        {
          code: 'const div = document.createElement("div"); div.innerHTML = userData;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'const div = document.createElement("div"); div.textContent = userData;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - dangerouslySetInnerHTML', () => {
    ruleTester.run('invalid - unsanitized dangerouslySetInnerHTML', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: '<div dangerouslySetInnerHTML={{ __html: userInput }} />',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              // Note: Suggestions are provided by the rule but not recognized by test framework
              // because fix returns null (suggestions are not auto-fixable)
            },
          ],
        },
        {
          code: '<span dangerouslySetInnerHTML={{ __html: html }} />',
          errors: [
            {
              messageId: 'unsanitizedHtml',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = userInput;',
          filename: 'component.test.tsx',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'element.innerHTML = userInput;',
          filename: 'component.tsx',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'unsanitizedHtml',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - trustedLibraries', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = mySanitizer.clean(html);',
          options: [{ trustedLibraries: ['mySanitizer'] }],
        },
        {
          code: 'element.innerHTML = sanitize(userInput);',
          options: [{ trustedLibraries: ['sanitize'] }],
        },
        {
          code: 'element.innerHTML = purify(html);',
        },
        {
          code: 'element.innerHTML = escape(userInput);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - ignorePatterns with invalid regex', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: 'testElement.innerHTML = html;',
          options: [{ ignorePatterns: ['['] }], // Invalid regex should be caught and treated as literal, but '[' doesn't match 'testElement'
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'testElement.textContent = html;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - sanitization function names', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = sanitize(userInput);',
        },
        {
          code: 'element.innerHTML = sanitizeHtml(html);',
        },
        {
          code: 'element.innerHTML = purify(content);',
        },
        {
          code: 'element.innerHTML = escape(text);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - JSX with non-object expression', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: '<div dangerouslySetInnerHTML={userInput} />',
          errors: [
            {
              messageId: 'unsanitizedHtml',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - JSX with object but no __html', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: '<div dangerouslySetInnerHTML={{ html: userInput }} />',
          errors: [
            {
              messageId: 'unsanitizedHtml',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - assignment to non-innerHTML property', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.textContent = userInput;',
        },
        {
          code: 'element.className = "test";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - trusted libraries with MemberExpression', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = mySanitizer.clean(html);',
          options: [{ trustedLibraries: ['mySanitizer'] }],
        },
        {
          code: 'element.innerHTML = customLib.sanitize(userInput);',
          options: [{ trustedLibraries: ['customLib'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - non-Identifier right side that is safe', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = "safe string";',
        },
        {
          code: 'element.innerHTML = 123;',
        },
        {
          code: 'element.innerHTML = true;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - Identifier with suspicious patterns', noUnsanitizedHtml, {
      valid: [],
      invalid: [
        {
          code: 'element.innerHTML = data;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = data;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
        {
          code: 'element.innerHTML = input;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = input;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
        {
          code: 'element.innerHTML = value;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = value;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
        {
          code: 'element.innerHTML = param;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = param;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
        {
          code: 'element.innerHTML = arg;',
          errors: [
            {
              messageId: 'unsanitizedHtml',
              suggestions: [
                {
                  messageId: 'useTextContent',
                  output: 'element.textContent = arg;',
                },
                // Note: useSanitizeLibrary suggestion is provided but not recognized by test framework
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - CallExpression sanitization with MemberExpression', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = DOMPurify.sanitize(html);',
        },
        {
          code: 'element.innerHTML = myLib.sanitize(userInput);',
          options: [{ trustedLibraries: ['myLib'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - allowInTests option behavior', noUnsanitizedHtml, {
      valid: [
        {
          code: 'element.innerHTML = userInput;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'element.innerHTML = userInput;',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'unsanitizedHtml',
              // No suggestions when allowInTests is true but file is not a test file
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - JSX with CallExpression sanitization', noUnsanitizedHtml, {
      valid: [
        {
          code: '<div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />',
        },
        {
          code: '<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />',
        },
        {
          code: '<div dangerouslySetInnerHTML={{ __html: purify(content) }} />',
        },
        {
          code: '<div dangerouslySetInnerHTML={{ __html: escape(text) }} />',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - JSX with ignorePatterns', noUnsanitizedHtml, {
      valid: [
        {
          code: '<div dangerouslySetInnerHTML={{ __html: safeHtml }} />',
          options: [{ ignorePatterns: ['safeHtml'] }],
        },
      ],
      invalid: [
        {
          code: '<div dangerouslySetInnerHTML={{ __html: userInput }} />',
          options: [{ ignorePatterns: ['safeHtml'] }],
          errors: [
            {
              messageId: 'unsanitizedHtml',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - JSX with non-user-input identifiers', noUnsanitizedHtml, {
      valid: [
        {
          code: '<div dangerouslySetInnerHTML={{ __html: staticContent }} />',
        },
        {
          code: '<div dangerouslySetInnerHTML={{ __html: template }} />',
        },
      ],
      invalid: [],
    });
  });
});

