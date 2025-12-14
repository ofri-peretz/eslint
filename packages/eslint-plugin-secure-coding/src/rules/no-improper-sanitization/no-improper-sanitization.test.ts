/**
 * Tests for no-improper-sanitization rule
 * Security: CWE-116 (Improper Encoding or Escaping of Output)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from './index';

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

describe('no-improper-sanitization', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper sanitization', noImproperSanitization, {
      valid: [
        // Safe sanitization with trusted libraries
        'element.innerHTML = DOMPurify.sanitize(userInput);',
        'const safe = he.encode(userInput);',
        'const encoded = encodeURIComponent(userInput);',
        // textContent is safe (doesn't interpret HTML)
        'element.textContent = userInput;',
        // Direct assignment without user input indicators isn't flagged
        'element.innerHTML = userInput;',
        // String concatenation without dangerous context
        'const html = "<div>" + req.body.content + "</div>";',
        // Safe annotation
        `
          /** @safe */
          myCustomSanitize(req.body.data);
        `,
        // Proper HTML entity escaping

      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Incomplete HTML Escaping', () => {
    ruleTester.run('invalid - incomplete HTML escaping', noImproperSanitization, {
      valid: [],
      invalid: [
        // Incomplete escaping - only escapes < but not other dangerous chars
        {
          code: 'element.innerHTML = userInput.replace(/</g, "&lt;");',
          errors: [
            {
              messageId: 'incompleteHtmlEscaping',
            },
          ],
        },
        // Incomplete escaping - only escapes > but not other dangerous chars
        {
          code: 'const safe = data.replace(/>/g, "&gt;");',
          errors: [
            {
              messageId: 'incompleteHtmlEscaping',
            },
          ],
        },

        // Chained replacement flagged individually (Known Limitation)
        {
          code: 'element.innerHTML = userInput.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/&/g, "&amp;");',
          errors: [
            { messageId: 'incompleteHtmlEscaping' },
            { messageId: 'incompleteHtmlEscaping' },
            { messageId: 'incompleteHtmlEscaping' },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Custom Sanitizer Functions', () => {
    ruleTester.run('invalid - custom sanitizer with user input', noImproperSanitization, {
      valid: [],
      invalid: [
        // Custom sanitize function with user input
        {
          code: 'const clean = mySanitize(req.body.content);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
        // Custom escape function with user data
        {
          code: 'const safe = myEscape(req.query.data);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
        // Custom clean function with user input
        {
          code: 'const result = myClean(req.params.id);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
      ],
    });
  });

  describe('Invalid Code - innerHTML Without Sanitization', () => {
    ruleTester.run('invalid - innerHTML with user input', noImproperSanitization, {
      valid: [],
      invalid: [
        // innerHTML with unsanitized user input
        {
          code: 'element.innerHTML = req.body.content;',
          errors: [{ messageId: 'insufficientXssProtection' }],
        },
        // innerHTML with query parameter
        {
          code: 'div.innerHTML = req.query.html;',
          errors: [{ messageId: 'insufficientXssProtection' }],
        },
      ],
    });
  });

  describe('Invalid Code - String Literals in Dangerous Contexts', () => {
    ruleTester.run('invalid - unescaped strings in dangerous contexts', noImproperSanitization, {
      valid: [],
      invalid: [
        // String with dangerous chars in innerHTML context
        {
          code: 'element.innerHTML = "<script>alert(1)</script>";',
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
        // String with dangerous chars in response send
        {
          code: 'res.send("<img src=x onerror=alert(1)>");',
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
      ],
    });
  });

  describe('Context Encoding Detection', () => {
    ruleTester.run('context - URL and SQL context detection', noImproperSanitization, {
      valid: [
        // Proper URL encoding
        'const url = "https://example.com?q=" + encodeURIComponent(userInput);',
        // Parameterized query (not direct)
        'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
      ],
      invalid: [],
    });
  });
});
