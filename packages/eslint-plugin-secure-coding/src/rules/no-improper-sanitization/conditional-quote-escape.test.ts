/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An HTML-escape helper that takes the quote decision as a parameter.
 *
 * `s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')`
 * followed in the same block by `if (quote) { s = s.replace(/"/g, '&quot;') }`
 * does escape every character the rule asks for. A chain with no such later
 * statement, one that escapes a different variable, or one whose later
 * statement targets another character, is still incomplete.
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

const chain = `s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');`;
const incomplete = [{ messageId: 'incompleteHtmlEscaping' as const }];

describe('no-improper-sanitization — conditional quote escape', () => {
  ruleTester.run('conditional-quote-escape', noImproperSanitization, {
    valid: [
      {
        // @source apostrophecms/sanitize-html index.js:678
        // @found linting popular Node.js packages
        name: 'FP: chain, then `if (quote) { s = s.replace(/"/g, "&quot;") }`',
        code: `function escapeHtml(s, quote) { ${chain} if (quote) { s = s.replace(/"/g, '&quot;'); } return s; }`,
      },
      {
        // @source apostrophecms/sanitize-html index.js:688
        // @found linting popular Node.js packages
        name: 'FP: the same inside an if block, with a numeric-entity quote',
        code: `function escapeHtml(s, quote) { if (flag) { ${chain} if (quote) s = s.replace(/"/g, '&#34;'); } return s; }`,
      },
    ],
    invalid: [
      {
        name: 'an undeclared variable: the escaped value is read before any quote step',
        code: `s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); send(s);`,
        errors: incomplete,
      },
      {
        name: 'the quote step rewrites a shadowing inner binding, not the escaped one',
        code: `function escapeHtml(s, quote, other) { ${chain} if (quote) { let s = other; s = s.replace(/"/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the quote step sits after an unconditional return, so it never runs',
        code: `function escapeHtml(s) { ${chain} return s; s = s.replace(/"/g, '&quot;'); }`,
        errors: incomplete,
      },
      {
        name: 'the value is read before the quote step',
        code: `function escapeHtml(s, sink) { ${chain} sink(s); s = s.replace(/"/g, '&quot;'); return s; }`,
        errors: incomplete,
      },
      {
        name: 'a later quote step does not stand in for the missing ampersand step',
        code: `function escapeHtml(s, quote) { s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (quote) { s = s.replace(/"/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the chain is an argument, not a statement of its own',
        code: `function escapeHtml(s, quote) { keep(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')); if (quote) { s = s.replace(/"/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the chain is assigned under an if with no block',
        code: `function escapeHtml(s, quote) { if (quote) ${chain} if (quote) { s = s.replace(/"/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the later replacement text is not a literal',
        code: `function escapeHtml(s, quote, entity) { ${chain} if (quote) { s = s.replace(/"/g, entity); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'no quote step at all',
        code: `function escapeHtml(s) { ${chain} return s; }`,
        errors: incomplete,
      },
      {
        name: 'the quote step rewrites a different variable',
        code: `function escapeHtml(s, t, quote) { ${chain} if (quote) { t = t.replace(/"/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the later step escapes a different character',
        code: `function escapeHtml(s, quote) { ${chain} if (quote) { s = s.replace(/%/g, '&quot;'); } return s; }`,
        errors: incomplete,
      },
      {
        name: 'the quote step comes BEFORE the chain, so the chain is not followed by it',
        code: `function escapeHtml(s, quote) { if (quote) { s = s.replace(/"/g, '&quot;'); } ${chain} return s; }`,
        errors: incomplete,
      },
      {
        name: 'the later replacement is not a quote entity',
        code: `function escapeHtml(s, quote) { ${chain} if (quote) { s = s.replace(/"/g, ''); } return s; }`,
        errors: incomplete,
      },
    ],
  });
});
