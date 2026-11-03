/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the constant walk proves, case by case.
 *
 * The rule's question is "can the program decide this pattern before any input
 * arrives?" Each case below is one step of that walk — a binding, a table, a
 * write through a table, a self-feeding binding — with the answer the rule's
 * contract gives. Cases named `FP:` / `FN:` were wrong before the change that
 * added them, and fail with that change reverted.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralRegexp } from './index';

const ruleTester = new RuleTester();

const dynamic = {
  messageId: 'runtimeDecidedPattern' as const,
  data: { riskLevel: 'HIGH', safeAlternative: 'Pre-defined RegExp constants' },
};

ruleTester.run(
  'detect-non-literal-regexp — what the walk proves',
  detectNonLiteralRegexp,
  {
    valid: [
      // ── Templates and String.raw ───────────────────────────────────────────
      {
        name: 'String.raw with a constant substitution is fixed at parse time',
        code: `const V = 'a+'; export const R = new RegExp(String.raw\`^\${V}$\`);`,
      },
      // ── Operators ──────────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: arithmetic over a closed set of constants is as constant as concatenation',
        code: `export function f(wide) { let width = 2; if (wide) { width = 4; } return new RegExp('^\\\\d{' + width * 2 + '}$'); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: spreading a constant list into concat is as constant as spreading it into an array literal',
        code: `const A = ['x']; const B = ['y', 'z']; export const R = new RegExp(A.concat(...B).join('|'));`,
      },
      // ── Tables ─────────────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a table whose key is computed from a constant is still a closed set',
        code: `const K = 'email'; const P = { [K]: '^a$', phone: '^b$' }; export function f(req) { return new RegExp(P[req.query.k]); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: spreading a constant table into another keeps it closed',
        code: `const BASE = { a: '^a$' }; const P = { ...BASE, b: '^b$' }; export function f(req) { return new RegExp(P[req.query.k]); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a request-chosen index into a constant list picks WHICH pattern, never WHAT',
        code: `const L = ['^a$', '^b$']; export function f(req) { return new RegExp(L[Number(req.query.i)]); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a quoted key names its entry like a bare one',
        code: `const P = { 'email': '^a$' }; export function f() { return new RegExp(P.email); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a bracketed string key reads the one entry it spells, not the whole table',
        code: `export function f(req) { const P = { email: '^a$', raw: req.query.p }; return new RegExp(P['email']); }`,
      },
      {
        name: 'a spread ahead of the named entry does not hide the entry',
        code: `const BASE = { a: '^a$' }; const P = { ...BASE, email: '^b$' }; export function f() { return new RegExp(P.email); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a let table nothing rebinds holds what it was declared with',
        code: `let P = { email: '^a$' }; export function f() { return new RegExp(P.email); }`,
      },
      {
        name: 'a table behind an angle-bracket assertion',
        code: `const P = <const>{ email: '^a$' }; export function f() { return new RegExp(P.email); }`,
      },
      // ── Reads of a table are not writes to it ──────────────────────────────
      {
        name: 'writing to another object keyed by a table entry does not mutate the table',
        code: `const P = { email: '^a$' }; const seen = {}; seen[P.email] = true; export function f() { return new RegExp(P.email); }`,
      },
      {
        name: 'reading a table entry into an assignment does not mutate the table',
        code: `const P = { email: '^a$' }; let last; last = P.email; export function f() { return new RegExp(P.email); }`,
      },
      {
        name: 'typeof of a table entry reads it',
        code: `const P = { email: '^a$' }; export function f() { if (typeof P.email !== 'string') return null; return new RegExp(P.email); }`,
      },
      {
        name: 'a table entry as a destructuring default is read, not written',
        code: `const P = { email: '^a$' }; export function f(opts) { const { email = P.email } = opts; return [email, new RegExp(P.email)]; }`,
      },
      {
        name: 'a table entry as an object-literal value is read, not written',
        code: `const P = { email: '^a$' }; export const copy = { email: P.email }; export const R = new RegExp(P.email);`,
      },
      {
        name: 'a table entry as a computed key is read, not written',
        code: `const P = { email: '^a$' }; export const byPattern = { [P.email]: 1 }; export const R = new RegExp(P.email);`,
      },
      {
        name: 'a table entry as a computed key in a destructuring pattern is read, not written',
        code: `const P = { email: '^a$' }; export function f(obj) { const { [P.email]: hit } = obj; return [hit, new RegExp(P.email)]; }`,
      },
      // ── Bindings ───────────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: the keys of a constant table are as fixed as its values',
        code: `const P = { a: '^a$' }; export function each() { for (const key in P) { new RegExp(key); } }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a binding assigned on every branch of an if is a closed set',
        code: `export function f(word) { let source; if (word) { source = '^\\\\w+$'; } else { source = '^\\\\d+$'; } return new RegExp(source); }`,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: an escape assigned after the declaration is still an escape',
        code: `export function f(input) { let safe; safe = input.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); return new RegExp(safe); }`,
      },
      // ── Clones ─────────────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a bracketed source is the same clone as a dotted one',
        code: `const RE = /a+/; export function f() { return new RegExp(RE['source'], 'g'); }`,
      },
      // ── The call itself ────────────────────────────────────────────────────
      {
        name: 'an empty RegExp has no pattern to report even when literals are not allowed',
        code: 'export const R = new RegExp();',
        options: [{ allowLiterals: false }],
      },
      {
        name: 'a literal exactly maxPatternLength long is within the limit, measured without its quotes',
        code: `export const R = new RegExp('${'x'.repeat(100)}');`,
      },
      {
        name: 'a test file is not linted — skipTestFiles',
        code: 'export function f(userInput) { return new RegExp(userInput); }',
        filename: 'src/compile.test.ts',
      },
    ],
    invalid: [
      // ── Templates and String.raw ───────────────────────────────────────────
      {
        name: 'a tag that is not String.raw proves nothing, even with no substitution',
        code: 'export function f(tag) { return new RegExp(tag`^abc$`); }',
        errors: [dynamic],
      },
      {
        name: 'a .raw tag on some other global is not String.raw',
        code: 'export const R = new RegExp(Template.raw`^abc$`);',
        errors: [dynamic],
      },
      {
        name: 'a template with one runtime part is decided at runtime',
        code: "const A = ['x']; export function f(p) { return new RegExp(`${A.join('|')}${p}`); }",
        errors: [dynamic],
      },
      // ── Tables ─────────────────────────────────────────────────────────────
      {
        name: 'a lookup reads the named entry, not the first one',
        code: `export function f(req) { const P = { safe: '^a$', raw: req.query.p }; return new RegExp(P.raw); }`,
        errors: [dynamic],
      },
      {
        name: 'a table redeclared with var holds whichever declaration ran last',
        code: `export function f(req) { var P = { email: '^a$' }; var P = { email: req.query.p }; return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      {
        name: 'a let table that is rebound is not the table it was declared as',
        code: `export function f(req) { let P = { email: '^a$' }; P = { email: req.query.p }; return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      {
        name: 'a request-chosen key into a table with a method can pick the method',
        code: `export function f(req) { const P = { a: '^a$', pick() { return req.query.p; } }; return new RegExp(P[req.query.k]); }`,
        errors: [dynamic],
      },
      {
        name: 'a dynamic step in a lookup chain proves nothing about the entry it lands on',
        code: `const K = 'user'; export function f(req) { const P = { [K]: { email: '^a$' }, admin: { email: req.query.p } }; return new RegExp(P[req.query.k].email); }`,
        errors: [dynamic],
      },
      {
        name: 'a parameter replaced by a table is not a table this file declared',
        code: `export function f(req, P) { P = { a: '^a$', b: req.query.p }; return new RegExp(P[req.query.k]); }`,
        errors: [dynamic],
      },
      // ── Writes through a table ─────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: destructuring into a table entry writes through it',
        code: `const P = { email: '^a$' }; export function load(list) { [P.email] = list; } export function f() { return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: an object pattern that assigns a table entry writes through it',
        code: `const P = { email: '^a$' }; export function load(cfg) { ({ pattern: P.email } = cfg); } export function f() { return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a rest element that collects into a table entry writes through it',
        code: `const P = { list: ['^a$'] }; export function load(input) { [, ...P.list] = input; } export function f() { return new RegExp(P.list.join('|')); }`,
        errors: [dynamic],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a destructuring default that lands in a table entry writes through it',
        code: `const P = { email: '^a$' }; export function load(list) { [P.email = '^b$'] = list; } export function f() { return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a for-of that assigns a table entry writes through it',
        code: `const P = { email: '^a$' }; export function load(list) { for (P.email of list) {} } export function f() { return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a for-in that assigns a table entry writes through it',
        code: `const P = { email: '^a$' }; export function load(obj) { for (P.email in obj) {} } export function f() { return new RegExp(P.email); }`,
        errors: [dynamic],
      },
      // ── Bindings that feed themselves: the walk ends, and the value is unproven
      {
        name: 'a binding concatenated onto itself terminates and reports',
        code: `export function f() { let p = '^a'; p = p + '|b'; return new RegExp(p); }`,
        errors: [dynamic],
      },
      {
        name: 'a binding prefixed onto itself terminates and reports',
        code: `export function f() { let p = '^a'; p = '|b' + p; return new RegExp(p); }`,
        errors: [dynamic],
      },
      {
        name: 'a binding interpolated into itself terminates and reports',
        code: 'export function f() { let p = "^a"; p = `${p}|b`; return new RegExp(p); }',
        errors: [dynamic],
      },
      {
        name: 'a binding passed to concat on itself terminates and reports',
        code: `export function f() { let p = '^a'; p = '|b'.concat(p); return new RegExp(p); }`,
        errors: [dynamic],
      },
      {
        name: 'a binding fed through String.raw into itself terminates and reports',
        code: 'export function f() { let p = "^a"; p = String.raw`${p}b`; return new RegExp(p); }',
        errors: [dynamic],
      },
      {
        name: 'a list that spreads itself terminates and reports',
        code: `export function f() { let parts = ['^a']; parts = [...parts, 'b']; return new RegExp(parts); }`,
        errors: [dynamic],
      },
      {
        name: 'a var initialised from itself terminates and reports',
        code: `export function f() { var p = p + '|x'; return new RegExp(p); }`,
        errors: [dynamic],
      },
      {
        name: 'a binding cast back onto itself terminates and reports',
        code: `export function f() { let p: string = '^a'; p = p as string; return new RegExp(p); }`,
        errors: [dynamic],
      },
      {
        // A TypeError at runtime, but a file the parser accepts — and a linter
        // has to finish on every file the parser accepts.
        name: 'a table entry that reads itself terminates and reports',
        code: `export function f() { var T = { a: T.a }; return new RegExp(T.a); }`,
        errors: [dynamic],
      },
      // ── Escapes ────────────────────────────────────────────────────────────
      {
        name: 'a string search escapes one character, not the pattern',
        code: `export function f(input) { return new RegExp(input.replace('.', '\\\\.')); }`,
        errors: [dynamic],
      },
      {
        name: 'a replace with no arguments escapes nothing',
        code: 'export function f(input) { return new RegExp(input.replace()); }',
        errors: [dynamic],
      },
      {
        // Mirrors the `source++` case in the main suite: an update write carries
        // no expression to inspect, so nothing proves the binding still holds
        // the escape.
        name: 'an update write to an escaped binding has no expression to inspect',
        code: `export function f(input) { let safe = input.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); safe++; return new RegExp(safe); }`,
        errors: [dynamic],
      },
      // ── Length ─────────────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a long no-substitution template is measured like the same string literal',
        code: `export const R = new RegExp(\`${'x'.repeat(150)}\`);`,
        errors: [
          {
            messageId: 'runtimeDecidedPattern',
            data: {
              riskLevel: 'HIGH',
              safeAlternative: 'Regex literal syntax',
            },
          },
        ],
      },
      {
        name: 'a literal pattern reported under allowLiterals:false advises literal syntax',
        code: `export const R = new RegExp('^[a-z]+$');`,
        options: [{ allowLiterals: false }],
        errors: [
          {
            messageId: 'runtimeDecidedPattern',
            data: {
              riskLevel: 'HIGH',
              safeAlternative: 'Regex literal syntax',
            },
          },
        ],
      },
    ],
  },
);
