/**
 * Tests for no-innerhtml rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInnerhtml } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-innerhtml', noInnerhtml, {
  valid: [
    // Literal string assignment (allowed by default)
    {
      code: `element.innerHTML = '<div>Hello</div>';`,
    },
    // Template literal without expressions
    {
      code: 'element.innerHTML = `<div>Hello</div>`;',
    },
    // Using textContent (safe)
    {
      code: `element.textContent = userInput;`,
    },
    // Sanitized with DOMPurify
    {
      code: `element.innerHTML = DOMPurify.sanitize(userInput);`,
    },
    // Sanitized with custom sanitizer
    {
      code: `element.innerHTML = sanitize(userInput);`,
    },
    // Test file with allowInTests
    {
      code: `element.innerHTML = userInput;`,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // Not innerHTML
    {
      code: `element.className = userInput;`,
    },
  ],
  invalid: [
    // Variable assignment
    {
      code: `element.innerHTML = userInput;`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Template literal with expression
    {
      code: 'element.innerHTML = `<div>${userInput}</div>`;',
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // outerHTML
    {
      code: `element.outerHTML = content;`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Function call result
    {
      code: `element.innerHTML = getData();`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Literal strings NOT allowed
    {
      code: `element.innerHTML = '<div>Hello</div>';`,
      options: [{ allowLiteralStrings: false }],
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
    // Unknown sanitizer
    {
      code: `element.innerHTML = unknownSanitize(userInput);`,
      errors: [
        {
          messageId: 'dangerousInnerHTML',
        },
      ],
    },
  ],
});
