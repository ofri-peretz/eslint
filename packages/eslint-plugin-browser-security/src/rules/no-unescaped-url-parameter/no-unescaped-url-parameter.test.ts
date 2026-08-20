/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for no-unescaped-url-parameter (CWE-79 / CWE-116).
 *
 * ## These are LOCKS, and each one fails on the rule this replaced
 *
 * The previous implementation decided from `sourceCode.getText()` and a word
 * list, and was wrong in both directions at once. Every case under
 * `FALSE POSITIVES THAT SHIPPED` was REPORTED by it, and every case under
 * `FALSE NEGATIVES THAT SHIPPED` was SILENT — both verified with
 * `scripts/probe-rule.mts` against the unfixed rule before this file was
 * rewritten.
 *
 * The old suite is replaced rather than extended, because it asserted the false
 * positives: a template interpolating a `const PARAM = 'static'` was an INVALID
 * case there, pinned as a finding because the identifier matched a
 * case-insensitive `\bparam\b`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnescapedUrlParameter } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const ERROR = [{ messageId: 'unescapedUrlParameter' as const }];

describe('no-unescaped-url-parameter', () => {
  describe('FALSE POSITIVES THAT SHIPPED — every one was REPORTED by the old rule', () => {
    ruleTester.run('no verdict from a spelling', noUnescapedUrlParameter, {
      valid: [
        // `input` is in the printed text, and the value is a NUMBER.
        'export function priceUrl(input) { return `https://a.example.com/v1/i?p=${input.toFixed(2)}`; }',
        // `PARAM` matched a case-insensitive word test.
        "const PARAM = 'static'; const u = `https://a.example.com/v1/i?q=${PARAM}`;",
        // Every word the old rule keyed on, spelled onto compile-time literals.
        "const userInput = 'daily'; const redirectUrl = 'summary'; const next = 'x';" +
          'const u = `https://a.example.com/v1/r?a=${userInput}&b=${redirectUrl}&c=${next}`;',
        // `Number.parseInt` over genuinely inbound text: what lands in the URL
        // is the parser's output, which can only be digits.
        'const n = Number.parseInt(new URLSearchParams(location.search).get("p"), 10);' +
          'const u = `https://a.example.com/v1/i?p=${n}`;',
      ],
      invalid: [],
    });

    ruleTester.run('positions and shapes that are not this rule', noUnescapedUrlParameter, {
      valid: [
        // The hole chooses the HOST — an open redirect, owned next door.
        'export function tenant(host) { return `https://${host}/v1/status`; }',
        "export function tenant(host) { return 'https://' + host + '/v1/status'; }",
        // Every write to a Location belongs to no-insecure-redirects. The old
        // rule carried its own AssignmentExpression visitor and reported the
        // same defect a second time under a second CWE.
        'window.location = req.query.next;',
        'location = req.query.next;',
        'document.location.href = req.query.next;',
        // A module-private helper: every call site is in this file.
        "function seg(s) { return `https://cdn.example.com/a/${s}/m.json`; } export const M = seg('icons');",
        // Relative text that never reaches a URL sink is a path, not a URL.
        'export function key(id) { return `/users/${id}/preferences`; }',
        // Not a URL at all.
        'export function greet(name) { return `Welcome back, ${name}!`; }',
      ],
      invalid: [],
    });

    ruleTester.run('escaping is proven, not guessed', noUnescapedUrlParameter, {
      valid: [
        'export function s(q) { return `https://a.example.com/v1/s?q=${encodeURIComponent(q)}`; }',
        'export function s(q) { return `https://a.example.com/v1/s?q=${encodeURI(q)}`; }',
        'export function s(q) { return "https://a.example.com/v1/s?q=" + encodeURIComponent(q); }',
        // URLSearchParams percent-encodes on stringification.
        'export function s(q) { const p = new URLSearchParams({ q }); return `https://a.example.com/v1/s?${p.toString()}`; }',
      ],
      invalid: [],
    });
  });

  describe('FALSE NEGATIVES THAT SHIPPED — every one was SILENT in the old rule', () => {
    ruleTester.run('URL containers are not sanitisers', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const q = new URLSearchParams(location.search).get("q"); const u = `https://a.example.com/v1/s?q=${q}`;',
          errors: ERROR,
        },
        {
          code: 'const p = new URL(location.href).searchParams; const u = `https://a.example.com/v1/s?q=${p.get("next")}`;',
          errors: ERROR,
        },
        {
          code: 'const t = new URLSearchParams(location.search).getAll("tag"); const u = `https://a.example.com/v1/i?t=${t.join(",")}`;',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('DOM reads', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const el = document.getElementById("q"); const u = `https://a.example.com/v1/s?q=${el.value}`;',
          errors: ERROR,
        },
        {
          code: 'const el = document.querySelector("#q"); el.addEventListener("input", (e) => fetch(`https://a.example.com/v1/s?q=${e.target.value}`));',
          errors: ERROR,
        },
        {
          code: 'import { useRef } from "react"; export function C() { const r = useRef(null); return fetch(`https://a.example.com/v1/s?q=${r.current.value}`); }',
          errors: ERROR,
        },
        {
          code: 'export function f(form) { const d = new FormData(form); return fetch(`https://a.example.com/v1/s?e=${d.get("email")}`); }',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('an exported function cannot know its callers', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'export function buildSearchUrl(term) { return `https://a.example.com/v1/s?term=${term}`; }',
          errors: ERROR,
        },
        {
          code: 'export const build = (term) => `https://a.example.com/v1/s?term=${term}`;',
          errors: ERROR,
        },
        {
          code: 'export default function handler(req) { return fetch(`https://i.example.com/v1/e?m=${req.body.message}`); }',
          errors: ERROR,
        },
        {
          code: 'export class C { urlFor(name) { return `https://r.example.com/v3/render?name=${name}`; } }',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('a bracket is not a sanitiser', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'const u = `https://a.example.com/v1/r?s=${location["search"]}`;',
          errors: ERROR,
        },
        {
          code: 'const f = document.querySelectorAll("input"); const u = `https://a.example.com/v1/s?q=${f[0]["value"]}`;',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('relative URLs, once a sink makes them URLs', noUnescapedUrlParameter, {
      valid: [],
      invalid: [
        {
          code: 'export function p(slug) { const u = `/api/v1/pages?slug=${slug}`; return fetch(u); }',
          errors: ERROR,
        },
        {
          code: 'export function l(t) { const x = new XMLHttpRequest(); x.open("GET", `/api/v1/lookup?t=${t}`); }',
          errors: ERROR,
        },
        {
          code: 'export function A({ id }) { return <img src={`/api/v1/avatars?u=${id}`} alt="" />; }',
          filename: 'avatar.tsx',
          errors: ERROR,
        },
      ],
    });
  });

  describe('adversarial wave — what the second corpus broke', () => {
    ruleTester.run('arithmetic is not concatenation', noUnescapedUrlParameter, {
      valid: [
        'export function next(page) { return `https://a.example.com/v1/i?p=${page + 1}`; }',
        'export function prev(page) { return `https://a.example.com/v1/i?p=${page - 1}`; }',
      ],
      invalid: [
        // A string literal on either side puts it back in play.
        {
          code: 'export function s(q) { return `https://a.example.com/v1/s?q=${q + "!"}`; }',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('a written-down type is a knowable set', noUnescapedUrlParameter, {
      valid: [
        "export function s(d: 'asc' | 'desc') { return `https://a.example.com/v1/i?d=${d}`; }",
        'export function p(n: number) { return `https://a.example.com/v1/i?p=${n}`; }',
        'export function f(b: boolean) { return `https://a.example.com/v1/i?f=${b}`; }',
      ],
      invalid: [
        // `string` proves nothing.
        {
          code: 'export function s(q: string) { return `https://a.example.com/v1/s?q=${q}`; }',
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('a shadowed global is not the global', noUnescapedUrlParameter, {
      valid: [
        // A local class of the same name is an in-memory map.
        'class URLSearchParams { constructor(s) { this.s = s; } get(k) { return this.s[k]; } }' +
          "const d = new URLSearchParams({ sort: 'name' });" +
          'const u = `https://a.example.com/v1/i?s=${d.get("sort")}`;',
        'class FormData { constructor(d) { this.d = d; } get(k) { return this.d[k]; } }' +
          "const p = new FormData({ plan: 'pro' });" +
          'const u = `https://a.example.com/v1/c?p=${p.get("plan")}`;',
        // A local `document` that is a parsed content model, not the DOM.
        'export function r(document) { const n = document.getElementById("t"); return `https://a.example.com/v1/p?t=${n.value}`; }',
      ],
      invalid: [],
    });

    ruleTester.run('a pattern binds a part, not the whole', noUnescapedUrlParameter, {
      valid: [
        // `origin` is the browser-normalised current origin. Resolving a
        // destructure to its initialiser and stopping there made this a finding.
        'export function c() { const { origin } = new URL(location.href); return `https://auth.example.com/v1/a?i=${origin}`; }',
        // The same-origin components of `location`, in a QUERY position.
        'const u = `https://m.example.com/v1/h?s=${location.protocol}&h=${location.host}`;',
      ],
      invalid: [],
    });

    ruleTester.run('what is joined is what decides', noUnescapedUrlParameter, {
      valid: [
        "const F = ['id', 'name']; const u = `https://a.example.com/v1/i?f=${F.join(',')}`;",
        // A container over an object this module owns.
        "export function d() { const p = new URLSearchParams({ sort: 'name' }); return `https://a.example.com/v1/i?f=${p.get('sort')}`; }",
      ],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('allowInTests', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'export function s(q) { return `https://a.example.com/v1/s?q=${q}`; }',
          filename: 'search.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'export function s(q) { return `https://a.example.com/v1/s?q=${q}`; }',
          filename: 'handler.ts',
          options: [{ allowInTests: true }],
          errors: ERROR,
        },
      ],
    });

    ruleTester.run('ignorePatterns', noUnescapedUrlParameter, {
      valid: [
        {
          code: 'const u = `https://a.example.com/v1/s?q=${req.query.q}`;',
          options: [{ ignorePatterns: ['req\\.query'] }],
        },
        // An unparseable pattern is discarded, not thrown.
        {
          code: 'const u = `https://a.example.com/v1/s?q=${req.query.q}`;',
          options: [{ ignorePatterns: ['(', 'req\\.query'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run(
      'trustedLibraries is resolved through the import graph',
      noUnescapedUrlParameter,
      {
        valid: [
          {
            code: 'import querystring from "node:querystring"; export function s(q) { return `https://a.example.com/v1/s?q=${querystring.escape(q)}`; }',
          },
          {
            code: 'import enc from "my-encoder"; export function s(q) { return `https://a.example.com/v1/s?q=${enc.write(q)}`; }',
            options: [{ trustedLibraries: ['my-encoder'] }],
          },
        ],
        invalid: [
          // THE LOCK. The old rule lowercased the RECEIVER'S NAME and asked
          // whether it contained a trusted-library string, so any call on a
          // binding spelled `urlPart`, `curlOptions` or `myUrls` was treated
          // as already encoded. `urlPart.trim()` is a parameter of an exported
          // function with the whitespace taken off — nothing encoded it.
          {
            code: 'export function s(urlPart) { return `https://a.example.com/v1/s?q=${urlPart.trim()}`; }',
            errors: ERROR,
          },
          // And the same shape spelled with the library name exactly.
          {
            code: 'export function s(url) { return `https://a.example.com/v1/s?q=${url.toLowerCase()}`; }',
            errors: ERROR,
          },
        ],
      },
    );
  });
});
