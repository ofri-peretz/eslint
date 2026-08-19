/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cloning a RegExp cannot introduce backtracking the original did not have.
 *
 * `.source` is a string the ENGINE produced from an already-compiled pattern,
 * not one a caller supplied. Executed against `recheck` rather than argued —
 * see `benchmarks/rule-corpus/secure-coding__detect-non-literal-regexp/REGEXP-FACTS.md`:
 *
 * ```
 *   /(x+x+)+y/        original=vulnerable  clone=vulnerable  IDENTICAL
 *   /^\d+$/           original=safe        clone=safe        IDENTICAL
 *   /(a|a)*b/i        original=vulnerable  clone=vulnerable  IDENTICAL
 *   /^[a-z]{1,10}$/gm original=safe        clone=safe        IDENTICAL
 * ```
 *
 * 4/4 byte-identical, oracle verdict included. So a finding on a clone is one of
 * two things and neither helps: a DUPLICATE, when the original is a literal in
 * the same file that `no-redos-vulnerable-regex` already reports with proof; or
 * a MISATTRIBUTION, pointing the reader at the copy instead of the pattern.
 *
 * Measured on 20 repositories: 7 cases / 10 findings, in mongoose, webpack,
 * n8n and nest. None of the 30 corpus fixtures uses the shape, and no test did
 * either — which is why the duel scores 100% and never saw it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralRegexp } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-non-literal-regexp — cloning', detectNonLiteralRegexp, {
  valid: [
    {
      // Automattic/mongoose lib/helpers/clone.js:247
      name: 'the canonical clone, source and flags',
      code: `export function clone(regexp) { return new RegExp(regexp.source, regexp.flags); }`,
    },
    {
      // webpack/webpack
      name: 'a clone whose receiver is named something else',
      code: `export function f(source) { return new RegExp(source.source, source.flags); }`,
    },
    {
      // n8n-io/n8n — cloning a module constant to add a flag.
      name: 'a clone that replaces the flags with a literal',
      code: `const PLACEHOLDER = /\\{\\{(.*?)\\}\\}/; export function f() { return new RegExp(PLACEHOLDER.source, 'g'); }`,
    },
    {
      // The receiver is bound to a CONSTRUCTED RegExp rather than a literal.
      // Still a clone: whatever `built` compiles to, the copy compiles to the
      // same thing.
      name: 'a clone of a constructed RegExp',
      code: `const built = new RegExp('a+'); export function f() { return new RegExp(built.source, 'g'); }`,
    },
    {
      // The call form, which is the same constructor without `new`.
      name: 'a clone of a RegExp built by call',
      code: `const built = RegExp('a+'); export function f() { return new RegExp(built.source, 'g'); }`,
    },
  ],
  invalid: [
    {
      // The point of the whole exemption, stated as a test: when the original
      // IS runtime-decided, the finding does not disappear — it moves to the
      // line that decides it. One report, on `new RegExp(p)`, not on the copy.
      name: 'a clone of a dynamic RegExp reports ONCE, at the original',
      code: `export function f(p) { const built = new RegExp(p); return new RegExp(built.source, 'g'); }`,
      errors: 1,
    },
    // CONTROLS. Without these, "clones are quiet" would pass on a rule that had
    // stopped reporting altogether.
    {
      name: 'CONTROL: a bare identifier is still runtime-decided',
      code: `export function f(pattern) { return new RegExp(pattern); }`,
      errors: 1,
    },
    {
      // `.source` of something that is NOT a RegExp proves nothing. An object
      // literal, a parsed config, a DOM node all have a `.source` that is
      // whatever someone put there.
      name: 'CONTROL: .source on a plain object is not a clone',
      code: `export function f(config) { return new RegExp(config.source); }`,
      errors: 1,
    },
    {
      // The receiver does not resolve at all — an undeclared global. There is
      // no binding to inspect, so nothing shows it is a RegExp.
      name: 'CONTROL: an unresolvable receiver is not a clone',
      code: `export function f() { return new RegExp(externalPattern.source); }`,
      errors: 1,
    },
    {
      // Two definitions on one name: the first proves nothing about what the
      // binding holds at the construction. Same reasoning as the twice-declared
      // allowlist in detect-object-injection.
      name: 'CONTROL: a receiver declared twice is not a closed binding',
      code: `var re = /a/; var re = fromConfig; export function f() { return new RegExp(re.source); }`,
      errors: 1,
    },
    {
      // The binding resolves to a Literal that is not a regex. A string has a
      // `.source` only if someone put one there, and `'abc'.source` is
      // undefined — which is exactly why `'regex' in init` is checked rather
      // than assuming any Literal initialiser is a pattern.
      name: 'CONTROL: a receiver bound to a string literal is not a RegExp',
      code: `const re = 'abc'; export function f() { return new RegExp(re.source); }`,
      errors: 1,
    },
    {
      // The receiver is not a bare identifier, so it cannot be resolved to a
      // regex in this file — and with no matching `.flags` there is no clone
      // idiom either. `this.pattern.source` and `opts.re.source` both land
      // here, and neither proves the receiver is a RegExp.
      name: 'CONTROL: a member-expression receiver without .flags is not a clone',
      code: `export function f(opts) { return new RegExp(opts.re.source); }`,
      errors: 1,
    },
    {
      // A declarator with no initialiser: `let re;` later assigned. There is
      // nothing to read, so the receiver cannot be shown to be a RegExp, and
      // the rule must decline rather than assume.
      name: 'CONTROL: a receiver declared without an initialiser is not a clone',
      code: `export function f(cond) { let re; if (cond) { re = /a/; } return new RegExp(re.source); }`,
      errors: 1,
    },
    {
      // Concatenation is not cloning. A literal may itself carry a quantifier —
      // `re.source + '+'` — so only the pure form is claimed. nestjs/nest uses
      // this shape and keeps its finding deliberately.
      name: 'CONTROL: appending to .source is construction, not cloning',
      code: `export function f(re) { return new RegExp(re.source + '$', re.flags); }`,
      errors: 1,
    },
  ],
});
