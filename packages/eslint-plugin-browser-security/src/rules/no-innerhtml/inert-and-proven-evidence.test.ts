/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two kinds of evidence the rule used to ignore, both read from the file alone.
 *
 * 1. A holder that cannot run anything: a `<template>`, a `<style>`, or a
 *    document from `createHTMLDocument` / `DOMParser`, as long as no node ever
 *    leaves it. 24 of 37 findings on triliumnext/trilium were this shape.
 * 2. A value proven sanitised by what the file does with it: a `const` holding
 *    `DOMPurify.sanitize(...)`, a local wrapper that returns it, or a local
 *    function that rewrites all five markup characters.
 *
 * Every invalid case is the same shape with one proof removed, because an
 * exemption is only worth having if the neighbouring unsafe code still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noInnerhtml } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const IMPORT = `import DOMPurify from 'dompurify';\n`;

const FIVE_REPLACES = `.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')`;

describe('no-innerhtml: an inert holder that only yields text', () => {
  ruleTester.run('inert-holder', noInnerhtml, {
    valid: [
      {
        // @source triliumnext/trilium widgets/dialogs/jump_to_note.tsx htmlToText
        name: 'a template whose text is read and which goes nowhere else',
        code: `function htmlToText(html) {
          const template = document.createElement('template');
          template.innerHTML = html;
          return template.content.textContent;
        }`,
      },
      {
        // @source triliumnext/trilium services/link_targets.ts parseAsPage
        name: 'a template queried for one attribute value',
        code: `function href(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          return t.content.querySelector('a')?.getAttribute('href');
        }`,
      },
      {
        // @source tldraw useClipboardEvents.ts stripHtml
        name: 'a createHTMLDocument body whose textContent is returned',
        code: `function stripHtml(html) {
          const doc = document.implementation.createHTMLDocument('');
          doc.body.innerHTML = html;
          return doc.body.textContent || doc.body.innerText || '';
        }`,
      },
      {
        // @source element-web editor/serialize.ts
        name: 'a DOMParser document read back as a string',
        code: `function normalise(html) {
          const doc = new DOMParser().parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.innerHTML;
        }`,
      },
      {
        name: 'a DOMParser held in a variable before it parses',
        code: `function text(html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
      },
      {
        name: 'an element created by an inert document',
        code: `function text(html) {
          const doc = document.implementation.createHTMLDocument('');
          const box = doc.createElement('div');
          box.innerHTML = html;
          return box.textContent;
        }`,
      },
      {
        name: 'a template written through insertAdjacentHTML and only read as text',
        code: `function text(html) {
          const t = document.createElement('template');
          t.insertAdjacentHTML('beforeend', html);
          return t.content.textContent;
        }`,
      },
      {
        name: 'a template that is never read again',
        code: `function discard(html) {
          document.createElement('template').innerHTML = html;
        }`,
      },
      {
        name: 'an element made by the document of a createHTMLDocument call',
        code: `function text(html) {
          const box = document.implementation.createHTMLDocument('').createElement('div');
          box.innerHTML = html;
          return box.textContent;
        }`,
      },
      {
        // @source hedgedoc, tldraw usePrint.ts: a <style> element holds raw text
        name: 'a style element, whose content is raw text and creates no node',
        code: `function addCss(css) {
          const style = document.createElement('style');
          style.innerHTML = css;
          document.head.appendChild(style);
        }`,
      },
    ],
    invalid: [
      {
        name: 'a template name declared twice, so it has no single meaning',
        code: `function text(html, other) {
          var t = document.createElement('template');
          var t = other;
          t.innerHTML = html;
          return t.content.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a holder imported from another module',
        code: `import { holder } from './holder';
        function show(html) { holder.innerHTML = html; return holder.textContent; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'the content of a template taken out by destructuring is not the template',
        code: `function show(html) {
          const { content: t } = document.createElement('template');
          t.innerHTML = html;
          document.body.append(t);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a DOMParser called without new, which builds nothing inert',
        code: `function text(html) {
          const parser = DOMParser();
          const doc = parser.parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a DOMParser reached through a namespace, which is not the global',
        code: `function text(html) {
          const parser = new lib.DOMParser();
          const doc = parser.parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a node cloned out of the template, which is not known to stay inside',
        code: `function text(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          return t.content.cloneNode(true).textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'querySelector passed on as a value to a call whose result is read',
        code: `function text(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          return wrap(t.content.querySelector).textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template written through a createContextualFragment call',
        code: `function show(html) { document.createElement('template').createContextualFragment(html); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a node holder reached through a property of this',
        code: `class V { show(html) { this.node.innerHTML = html; } }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a holder that is a property read of something else',
        code: `function show(holders, html) { const t = holders.main; t.innerHTML = html; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a holder that is the result of a plain function call',
        code: `function show(makeHolder, html) { const t = makeHolder(); t.innerHTML = html; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a holder picked by a key chosen at runtime',
        code: `function show(holders, key, html) { holders[key].innerHTML = html; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template declared without a value, so the first write is not the declaration',
        code: `function text(html) {
          let t;
          t = document.createElement('template');
          t.innerHTML = html;
          return t.content.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a holder taken out of a destructuring pattern',
        code: `function text(holders, html) {
          const { t } = holders;
          t.innerHTML = html;
          return t.content.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a parser handed in as a parameter, which may be anything',
        code: `function text(parser, html) {
          const doc = parser.parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a parser that is not a new DOMParser',
        code: `function text(make, html) {
          const parser = make();
          const doc = parser.parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a parseFromString on a constructor that is not DOMParser',
        code: `function text(html) {
          const doc = new Parser().parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          return doc.body.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'querySelector handed over as a function, not called',
        code: `function build(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          mount(t.content.querySelector);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template whose content is appended to the page',
        code: `function show(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          document.body.append(t.content);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template returned to a caller',
        code: `function build(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          return t.content;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template passed to another function',
        code: `function build(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          mount(t);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a node taken out of an inert document and attached to the page',
        code: `function build(html) {
          const doc = new DOMParser().parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          document.body.append(doc.body.firstChild);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a node found by querySelector and then attached',
        code: `function build(html) {
          const t = document.createElement('template');
          t.innerHTML = html;
          document.body.append(t.content.querySelector('img'));
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a detached div of the live document still loads images',
        code: `function text(html) {
          const box = document.createElement('div');
          box.innerHTML = html;
          return box.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template that is reassigned, so its value is not known',
        code: `function text(html, other) {
          let t = document.createElement('template');
          t = other;
          t.innerHTML = html;
          return t.content.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a template passed in as a parameter',
        code: `function text(t, html) {
          t.innerHTML = html;
          return t.content.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a div of the live document, whatever the document is called',
        code: `function text(doc, html) {
          const box = doc.createElement('div');
          box.innerHTML = html;
          return box.textContent;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a computed property name on an inert document is not known to be a read',
        code: `function text(html, key) {
          const doc = new DOMParser().parseFromString('', 'text/html');
          doc.body.innerHTML = html;
          document.body.append(doc.body[key]);
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
    ],
  });
});

describe('no-innerhtml: a value proven sanitised inside the file', () => {
  ruleTester.run('proven-sanitised', noInnerhtml, {
    valid: [
      {
        name: 'a sanitiser output used twice in one value',
        code: `${IMPORT}function f(el, html) {
          const clean = DOMPurify.sanitize(html);
          el.innerHTML = '<p>' + clean + '</p>' + clean;
        }`,
      },
      {
        name: 'a local wrapper used twice in one value',
        code: `${IMPORT}function wrap(html) { return DOMPurify.sanitize(html); }
        function f(el, a, b) { el.innerHTML = wrap(a) + wrap(b); }`,
      },
      {
        // @source triliumnext/trilium services/office_renderer.ts
        name: 'a const holding the sanitiser output',
        code: `${IMPORT}function f(el, html) {
          const clean = DOMPurify.sanitize(html);
          el.innerHTML = clean;
        }`,
      },
      {
        name: 'a const holding a composite whose dynamic part is sanitised',
        code: `${IMPORT}function f(el, html) {
          const markup = '<div>' + DOMPurify.sanitize(html) + '</div>';
          el.innerHTML = markup;
        }`,
      },
      {
        name: 'a local wrapper that returns the sanitiser output',
        code: `${IMPORT}const sanitizeNote = (html) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
        function f(el, html) { el.innerHTML = sanitizeNote(html); }`,
      },
      {
        name: 'a local function declaration that returns the sanitiser output',
        code: `${IMPORT}function sanitizeNote(html) { return DOMPurify.sanitize(html); }
        function f(el, html) { el.innerHTML = sanitizeNote(html); }`,
      },
      {
        // @source triliumnext/trilium packages/commons escapeHtml
        name: 'a local escaper that rewrites all five markup characters',
        code: `function escapeHtml(text) { return String(text)${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = '<b>' + escapeHtml(name) + '</b>'; }`,
      },
      {
        name: 'a local arrow escaper under a name that says nothing about escaping',
        code: `const clean = (s) => s${FIVE_REPLACES};
        function f(el, name) { el.innerHTML = clean(name); }`,
      },
      {
        name: 'a local escaper written with replaceAll and string patterns',
        code: `const enc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
        function f(el, name) { el.innerHTML = enc(name); }`,
      },
    ],
    invalid: [
      {
        name: 'a local escaper whose chain has one extra multi-character pattern',
        code: `function escapeHtml(s) { return s${FIVE_REPLACES}.replace(/ab/g, '&amp;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose chain has one extra multi-character string pattern',
        code: `function escapeHtml(s) { return s${FIVE_REPLACES}.replaceAll('ab', '&amp;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose chain has one pattern held in a variable',
        code: `function escapeHtml(s) { return s${FIVE_REPLACES}.replace(pattern, '&amp;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose chain has one replacement held in a variable',
        code: `function escapeHtml(s) { return s${FIVE_REPLACES}.replace(/x/g, other); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose chain has one replacement that is not an entity',
        code: `function escapeHtml(s) { return s${FIVE_REPLACES}.replace(/x/g, 'y'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper applied to a conversion that is not String',
        code: `function escapeHtml(s) { return Number(s)${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper applied to String called with two arguments',
        code: `function escapeHtml(s) { return String(s, 2)${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose body is a statement that returns nothing',
        code: `function escapeHtml(s) { log(s); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose only statement throws the escaped text',
        code: `function escapeHtml(s) { throw s${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose only statement is a bare return',
        code: `function escapeHtml(s) { return; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose parameter has a default',
        code: `const escapeHtml = (s = '') => s${FIVE_REPLACES};
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a sanitiser output used twice, so the walk is not cut short by the first use',
        code: `${IMPORT}function f(el, html, other) {
          const clean = DOMPurify.sanitize(html);
          el.innerHTML = clean + other;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a const whose value is only sometimes sanitised',
        code: `${IMPORT}function f(el, html, trusted) {
          const maybe = trusted ? html : DOMPurify.sanitize(html);
          el.innerHTML = maybe;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a let that is assigned the sanitiser output and then the raw value',
        code: `${IMPORT}function f(el, html) {
          let v = DOMPurify.sanitize(html);
          v = html;
          el.innerHTML = v;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a parameter, which has no value to judge',
        code: `function f(el, clean) { el.innerHTML = clean; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a destructured binding is one piece of the call, not the call',
        code: `${IMPORT}function f(el, html) {
          const { value } = DOMPurify.sanitize(html);
          el.innerHTML = value;
        }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a binding that refers to itself ends the walk instead of looping',
        code: `function f(el) { const a = a + 'x'; el.innerHTML = a; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local function that refers to itself ends the walk instead of looping',
        code: `function again(x) { return again(x); }
        function f(el, html) { el.innerHTML = again(html); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local wrapper that returns its argument unchanged',
        code: `const sanitizeNote = (html) => html;
        function f(el, html) { el.innerHTML = sanitizeNote(html); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local wrapper with a branch that skips the sanitiser',
        code: `${IMPORT}function sanitizeNote(html, skip) {
          if (skip) return html;
          return DOMPurify.sanitize(html);
        }
        function f(el, html) { el.innerHTML = sanitizeNote(html, false); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper that leaves the quotes alone, unsafe inside an attribute',
        code: `function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function f(el, name) { el.innerHTML = '<a title="' + escapeHtml(name) + '">x</a>'; }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose replacement is not an entity',
        code: `function escapeHtml(s) { return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'"); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose pattern is not a single global character',
        code: `function escapeHtml(s) { return s.replace('&', '&amp;').replace(/</, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper that escapes a different value than its argument',
        code: `const other = 'x';
        function escapeHtml(s) { return other${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper that can return before escaping',
        code: `function escapeHtml(s) { if (!s) return s; return s${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose pattern is several characters long',
        code: `function escapeHtml(s) { return s.replace(/&&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose string pattern is several characters long',
        code: `function escapeHtml(s) { return s.replaceAll('&&', '&amp;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose replace has no replacement',
        code: `function escapeHtml(s) { return s.replace(/&/g); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper that calls replace with no arguments',
        code: `function escapeHtml(s) { return s.replace(); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper whose chain is built on a computed method',
        code: `function escapeHtml(s) { return s[method](/&/g, '&amp;'); }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
      {
        name: 'a local escaper with no parameter',
        code: `function escapeHtml() { return 'x'${FIVE_REPLACES}; }
        function f(el, name) { el.innerHTML = escapeHtml(name); }`,
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
    ],
  });
});
