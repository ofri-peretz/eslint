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
    // --- `write`/`writeln` are DOM sinks only on a document ----------------
    // The method name alone is one of the most overloaded in JavaScript. 23 of
    // this rule's 73 corpus findings were Node streams — mostly Shopify/cli
    // printing progress to stdout, reported as XSS.
    { code: 'process.stdout.write(`Preview URL: ${previewUrl}`)' },
    { code: 'process.stderr.write(`${message}\n`)' },
    { code: 'stdout.write(`Bundling ${extension.localIdentifier}...`)' },
    { code: 'options.stdout.write(`done ${name}`)' },
    { code: 'socket.write(payload)' },
    { code: 'res.write(chunk)' },
    { code: 'post.write(postData)' },
    { code: 'result.write(item, offset, length)' },
    // A receiver we cannot name at all — a call result, or a computed index —
    // is not a document, so it confers no sink.
    { code: 'getStream().write(data)' },
    { code: 'streams[0].write(data)' },
    // Owned by no-websocket-innerhtml. The generic rule must stay silent here
    // or the same range carries two findings in `recommended` — which is what
    // it did before the ownership gate, measured on the shipped tarball.
    {
      code: `
        const ws = new WebSocket('wss://example.test');
        ws.onmessage = (event) => { element.innerHTML = event.data; };
      `,
    },
    // Same value, no identifiable source: this one IS ours, and stays reported
    // by the invalid case below. The two tests are complements.
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
    // A document receiver is the real sink, in each spelling.
    {
      code: 'document.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'document.writeln(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'window.document.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'iframe.contentDocument.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: 'el.ownerDocument.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // A local named `doc` is the conventional binding for a document.
    {
      code: 'doc.write(userInput)',
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    // insertAdjacentHTML needs no receiver gate — nothing outside the DOM is
    // called that — so it still reports on any object.
    {
      code: "el.insertAdjacentHTML('beforeend', userInput)",
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },

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
