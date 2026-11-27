/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The sink decides what an escaper owes, not the shape of its chain.
 *
 * Measured on apostrophecms/apostrophe (3 findings), czlonkowski/n8n-mcp (3)
 * and dayuanjiang/next-ai-draw-io (1), each a real-code shape:
 *
 *   1. A TEXT-NODE escaper (`& < >`) beside a separate ATTRIBUTE escaper that
 *      also escapes the quote, in one file, where the text escaper is never
 *      used inside a tag. A quote needs escaping only where it can end an
 *      attribute value, and this file has put that duty on the other helper.
 *   2. Constant strings inside `res.json({...})`. The response is
 *      `application/json`; a `<` in a string there is not markup, whatever
 *      its sibling fields hold.
 *   3. A constant inside `new Command({...})` handed to a client's `send`: a
 *      DynamoDB `ConditionExpression: 'a <> :b'` is configuration of the object
 *      being built, not text written to anything.
 *
 * Nothing that BUILDS a value out of a tainted piece, uses the text escaper in
 * a tag, or carries dangerous markup is exempt.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperSanitization } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const textEscaper = `function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}`;
const attributeEscaper = `function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}`;
const incomplete = [{ messageId: 'incompleteHtmlEscaping' as const }];
const unsafe = [{ messageId: 'unsafeReplaceSanitization' as const }];

describe('no-improper-sanitization — sink context', () => {
  ruleTester.run('sink-context', noImproperSanitization, {
    valid: [
      {
        name: 'a text escaper used only in element content, beside an attribute escaper',
        code: `${textEscaper}
${attributeEscaper}
export const span = (label) => \`<span class="hidden">\${escapeText(label)} </span>\`;
export const attr = (name, value) => \` \${name}="\${escapeAttribute(value)}"\`;`,
      },
      {
        name: 'a text escaper appended to an html accumulator, beside an attribute escaper',
        code: `${textEscaper}
${attributeEscaper}
export function render(parts) {
  let html = '';
  for (const text of parts) html += escapeText(text);
  return html;
}`,
      },
      {
        name: 'a text escaper bound to a const arrow, beside an attribute escaper',
        code: `const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
${attributeEscaper}
export const cell = (v) => '<td>' + escapeHtml(v) + '</td>';`,
      },
      {
        name: 'a constant string in a JSON response whose sibling is request data',
        code: `res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Send messages to POST /messages?sessionId=<id> instead.' },
          id: req.body?.id ?? null,
        });`,
      },
      {
        name: 'a constant condition inside a client command',
        code: `await client.send(new UpdateItemCommand({
          UpdateExpression: 'SET lastMinute = :minute ADD tokenCount :tokens',
          ConditionExpression: 'lastMinute <> :minute',
        }));`,
      },
      {
        name: 'a template prefix, a longer concatenation and a bare prefix all keep the text escaper outside a tag',
        code: `${textEscaper}
${attributeEscaper}
export const a = (x) => \`<p>\` + escapeText(x);
export const b = (x) => '<p>' + '<b>' + escapeText(x);
export const c = (prefix, x) => prefix + escapeText(x);`,
      },
      {
        name: 'two text escapers share one scan, and a replace with a computed pattern is not a quote step',
        code: `function escapeTextA(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeTextB(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
${attributeEscaper}
export const strip = (s, re, q) => s.replace(re, '').replace(/"/g, q);`,
      },
    ],
    invalid: [
      {
        name: 'a chain inside a callback has no named function to vouch for',
        code: `${attributeEscaper}
export const out = list.map((t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));`,
        errors: incomplete,
      },
      {
        name: 'the same text escaper used inside a tag reports',
        code: `${textEscaper}
${attributeEscaper}
export const link = (url) => \`<a href="\${escapeText(url)}">go</a>\`;`,
        errors: incomplete,
      },
      {
        name: 'the same text escaper used after an unclosed attribute in a concatenation reports',
        code: `${textEscaper}
${attributeEscaper}
export const link = (url) => '<a href="' + escapeText(url) + '">go</a>';`,
        errors: incomplete,
      },
      {
        name: 'a lone text escaper with no attribute escaper in the file reports',
        code: `${textEscaper}
export const span = (label) => \`<span>\${escapeText(label)}</span>\`;`,
        errors: incomplete,
      },
      {
        name: 'an inline chain beside an attribute escaper has no function to vouch for',
        code: `${attributeEscaper}
export const out = (text) => '<p>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';`,
        errors: incomplete,
      },
      {
        name: 'a JSON string concatenated with request data is still markup built from input',
        code: `res.json({ html: '<b>' + req.query.name + '</b>' });`,
        errors: [...unsafe, ...unsafe],
      },
      {
        name: 'dangerous markup in a JSON response still reports',
        code: `res.json({ note: '<script>alert(1)</script>', id: req.body.id });`,
        errors: unsafe,
      },
      {
        name: 'dangerous markup inside a constructed object still reports',
        code: `res.send(new Page('<script>alert(1)</script>'));`,
        errors: unsafe,
      },
      {
        name: 'a constant with markup characters in a plain send still reports beside request data',
        code: `res.send({ msg: "don't", name: req.query.name });`,
        errors: unsafe,
      },
    ],
  });
});
