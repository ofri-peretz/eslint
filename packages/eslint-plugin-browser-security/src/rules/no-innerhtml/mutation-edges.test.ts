/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noInnerhtml } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const sink = (property: string, source: string) => [
  { messageId: 'dangerousInnerHTML' as const, data: { property, source } },
];

ruleTester.run('no-innerhtml — mutation edges', noInnerhtml, {
  valid: [
    {
      name: 'a concatenation of a literal and a sanitised value',
      code: "el.innerHTML = '<b>' + DOMPurify.sanitize(name) + '</b>';",
    },
    {
      name: 'a template whose every interpolation is sanitised',
      code: 'el.innerHTML = `<b>${escapeHtml(a)}</b><i>${escapeHtml(b)}</i>`;',
    },
    {
      name: 'a conditional whose both branches are safe',
      code: "el.innerHTML = cond ? DOMPurify.sanitize(html) : '<p>empty</p>';",
    },
    {
      name: 'a trusted sanitiser called while an unrelated function is declared in the file',
      code: 'function render() {}\nel.innerHTML = escapeHtml(input);',
    },
    {
      name: 'Object.create descriptors define a plain property, not an element sink',
      code: 'const shape = Object.create(proto, { innerHTML: { value: html } });',
    },
    {
      name: 'Object.assign writes only into its first argument',
      code: 'const props = Object.assign({ innerHTML: html }, defaults);',
    },
    {
      name: 'Object.assign of a property that is not a sink',
      code: 'Object.assign(el, { className: userClass });',
    },
    {
      name: 'a Node stream write is not a document write',
      code: 'process.stdout.write(message);',
    },
    {
      name: 'an upper-case prefix before Doc is not a document name (pdfkit)',
      code: 'PDFDoc.write(outputPath);',
    },
    {
      name: 'a name that merely starts with doc is not a document',
      code: 'dockerStream.write(chunk);',
    },
    {
      name: 'a member ending in Document after another word is not a document',
      code: 'this.pdfDocument.write(outputPath);',
    },
    {
      name: 'a member that starts with document is not a document',
      code: 'win.documentStream.write(chunk);',
    },
    {
      name: 'a computed key resolved to a non-sink constant',
      code: "const PROP = 'textContent';\nel[PROP] = userInput;",
    },
    {
      name: 'a computed key from a call is unknowable, not a sink',
      code: 'const PROP = pickProp();\nel[PROP] = userInput;',
    },
  ],
  invalid: [
    {
      name: 'one unsanitised operand in a concatenation',
      code: "el.innerHTML = '<b>' + escapeHtml(a) + b;",
      errors: sink('innerHTML', 'dynamic content'),
    },
    {
      name: 'one unsanitised interpolation in a template',
      code: 'el.innerHTML = `<b>${escapeHtml(a)}</b><i>${b}</i>`;',
      errors: sink('innerHTML', 'template literal with expressions'),
    },
    {
      name: 'a conditional with one unsanitised branch',
      code: 'el.innerHTML = cond ? DOMPurify.sanitize(html) : html;',
      errors: sink('innerHTML', 'dynamic content'),
    },
    {
      name: 'a trusted name bound to a local function expression',
      code: 'const escapeHtml = function (s) { return s; };\nel.innerHTML = escapeHtml(input);',
      errors: sink('innerHTML', 'function call result'),
    },
    {
      name: 'a template compiled with a dynamic argument is not a constant template',
      code: "const t = hbs('<div>', userTemplate);\nel.insertAdjacentHTML('beforeend', t());",
      errors: sink('insertAdjacentHTML', 'function call result'),
    },
    {
      name: 'a camel-case document variable is a document',
      code: 'iframeDoc.write(html);',
      errors: sink('write', 'variable "html"'),
    },
    {
      name: 'the source names a variable',
      code: 'el.outerHTML = markup;',
      errors: sink('outerHTML', 'variable "markup"'),
    },
    {
      name: 'the source names a member read as dynamic content',
      code: 'el.innerHTML = state.markup;',
      errors: sink('innerHTML', 'dynamic content'),
    },
  ],
});
