/**
 * Tests for no-improper-sanitization rule
 * Security: CWE-116 (Improper Encoding or Escaping of Output)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from '../../rules/security/no-improper-sanitization';

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
      ],
    });
  });
});
