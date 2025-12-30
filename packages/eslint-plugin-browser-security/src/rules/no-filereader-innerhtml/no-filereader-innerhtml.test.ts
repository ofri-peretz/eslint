/**
 * Tests for no-filereader-innerhtml rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noFilereaderInnerhtml } from './index';
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

ruleTester.run('no-filereader-innerhtml', noFilereaderInnerhtml, {
  valid: [
    // Safe: using textContent
    {
      code: `
        reader.onload = (e) => {
          element.textContent = e.target.result;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        fileReader.onload = (e) => {
          const sanitized = DOMPurify.sanitize(e.target.result);
          element.innerHTML = sanitized;
        };
      `,
    },
    // Not a FileReader handler
    {
      code: `
        button.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
    },
    // innerHTML outside handler
    {
      code: `
        element.innerHTML = content;
      `,
    },
    // Test files allowed by default
    {
      code: `
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      filename: 'file.test.ts',
    },
    // Using intermediate variable
    {
      code: `
        reader.onload = (e) => {
          const clean = DOMPurify.sanitize(e.target.result);
          element.innerHTML = clean;
        };
      `,
    },
  ],
  invalid: [
    // Direct innerHTML with e.target.result
    {
      code: `
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // fileReader variable name
    {
      code: `
        fileReader.onload = (event) => {
          container.innerHTML = event.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // outerHTML
    {
      code: `
        reader.onload = (e) => {
          widget.outerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'outerHTML' } }],
    },
    // onloadend event
    {
      code: `
        reader.onloadend = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        reader.onload = (e) => {
          list.insertAdjacentHTML('beforeend', e.target.result);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'insertAdjacentHTML' } }],
    },
    // fr variable name (common abbreviation)
    {
      code: `
        fr.onload = (e) => {
          preview.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Function expression
    {
      code: `
        reader.onload = function(e) {
          panel.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      filename: 'file.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
  ],
});
