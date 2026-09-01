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
    {
      name: 'a different property of the event, not the file bytes',
      // `result` on some other object is not FileReader content.
      code: `
        const reader = new FileReader();
        reader.onload = (e) => { element.innerHTML = e.target.metadata.result; };
      `,
    },

    // Safe: using textContent
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          element.textContent = e.target.result;
        };
      `,
    },
    // Safe: with sanitization
    {
      code: `
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          const sanitized = DOMPurify.sanitize(e.target.result);
          element.innerHTML = sanitized;
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
        const reader = new FileReader();
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      filename: 'file.test.ts',
    },
    // Using intermediate variable
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          const clean = DOMPurify.sanitize(e.target.result);
          element.innerHTML = clean;
        };
      `,
    },
  ],
  invalid: [
    {
      name: 'file contents written to innerHTML',
      // `result` read straight off the event object, no `.target` hop.
      code: `
        const reader = new FileReader();
        reader.onload = (e) => { element.innerHTML = e.result; };
      `,
      errors: 1,
    },

    {
      // Was a `valid` case labelled "Not a FileReader handler" — but it IS a
      // FileReader, and its payload reaches innerHTML. It only passed because
      // the receiver was named `button`, which failed the old name heuristic.
      // That heuristic was narrower than the ownership resolver, so
      // no-innerhtml skipped this line as ours while we stayed silent, and the
      // finding disappeared entirely.
      code: `
        const button = new FileReader();
        button.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      errors: 1,
    },

    // Direct innerHTML with e.target.result
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // fileReader variable name
    {
      code: `
        const fileReader = new FileReader();
        fileReader.onload = (event) => {
          container.innerHTML = event.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // outerHTML
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          widget.outerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'outerHTML' } }],
    },
    // onloadend event
    {
      code: `
        const reader = new FileReader();
        reader.onloadend = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // insertAdjacentHTML
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          list.insertAdjacentHTML('beforeend', e.target.result);
        };
      `,
      errors: [
        {
          messageId: 'unsafeInnerhtml',
          data: { method: 'insertAdjacentHTML' },
        },
      ],
    },
    // fr variable name (common abbreviation)
    {
      code: `
        const fr = new FileReader();
        fr.onload = (e) => {
          preview.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Function expression
    {
      code: `
        const reader = new FileReader();
        reader.onload = function(e) {
          panel.innerHTML = e.target.result;
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // Test file with allowInTests: false
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          element.innerHTML = e.target.result;
        };
      `,
      filename: 'file.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // addEventListener('load') pattern
    {
      code: `
        const reader = new FileReader();
        reader.addEventListener('load', (e) => {
          element.innerHTML = e.target.result;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // addEventListener('loadend') pattern
    {
      code: `
        const fileReader = new FileReader();
        fileReader.addEventListener('loadend', (event) => {
          container.innerHTML = event.target.result;
        });
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'innerHTML' } }],
    },
    // document.write with FileReader data
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          document.write(e.target.result);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'write' } }],
    },
    // document.writeln with FileReader data
    {
      code: `
        const reader = new FileReader();
        reader.onload = (e) => {
          document.writeln(e.target.result);
        };
      `,
      errors: [{ messageId: 'unsafeInnerhtml', data: { method: 'writeln' } }],
    },
  ],
});
