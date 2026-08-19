/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A pattern read from a frozen table is decided at build time, not at runtime.
 *
 * ```js
 * const PATTERNS = { email: '^[a-z]+@[a-z]+$' } as const;
 * new RegExp(PATTERNS.email);
 * ```
 *
 * Nothing outside the process chooses that string, so the rule's own message —
 * "pattern decided at runtime, not visible here" — is false about it. The
 * rule's docs have recommended exactly this shape as the safe alternative since
 * before the adversarial wave found it reported: `const PATTERNS = {...};
 * PATTERNS[userChoice]`.
 *
 * ## The trap, which is why this is not simply "resolve and accept"
 *
 * `const` prevents REBINDING, not MUTATION:
 *
 * ```js
 * const PATTERNS = { email: '^ok$' };
 * PATTERNS.email = req.body.pattern;      // legal
 * new RegExp(PATTERNS.email);             // attacker-chosen
 * ```
 *
 * So resolving the binding is not enough — the table must also never be written
 * through. The invalid cases below are the ones that would fall to a resolver
 * that only followed the declaration.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralRegexp } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-non-literal-regexp — constant lookup', detectNonLiteralRegexp, {
  valid: [
    {
      name: 'a property of an as-const table',
      code: `const P = { email: '^[a-z]+$' } as const; export function f() { return new RegExp(P.email); }`,
    },
    {
      name: 'a property of a plain const table',
      code: `const P = { email: '^[a-z]+$' }; export function f() { return new RegExp(P.email); }`,
    },
    {
      name: 'a table whose values are themselves built from literals',
      code: `const P = { email: '^' + '[a-z]+' + '$' }; export function f() { return new RegExp(P.email); }`,
    },
    {
      // A type assertion is an annotation, not a value — `'^a$' as string` is
      // still the literal. TypeScript codebases write this around config reads.
      name: 'a literal behind a type assertion',
      code: `export function f() { return new RegExp('^[a-z]+$' as string); }`,
    },
    {
      name: 'a table property behind a type assertion',
      code: `const P = { email: '^[a-z]+$' as string }; export function f() { return new RegExp(P.email); }`,
    },
    {
      // The whole sub-table as the pattern. Almost certainly a mistake by
      // whoever wrote it, but a fully determined one — it stringifies to
      // "[object Object]" every time — so it is not a pattern decided at
      // runtime and this rule is not the one to complain.
      name: 'a sub-table used directly as the pattern',
      code: `const P = { user: { email: '^[a-z]+$' } }; export function f() { return new RegExp(P.user); }`,
    },
    {
      name: 'a nested table',
      code: `const P = { user: { email: '^[a-z]+$' } }; export function f() { return new RegExp(P.user.email); }`,
    },
  ],
  invalid: [
    {
      // THE TRAP. The declaration is const and the initialiser is a literal,
      // but the table is written through before use.
      name: 'a table mutated from a request is not constant',
      code: `const P = { email: '^ok$' }; export function f(req) { P.email = req.body.p; return new RegExp(P.email); }`,
      errors: 1,
    },
    {
      // The write is somewhere else entirely, which is the realistic shape —
      // a config loader that patches the table at startup.
      name: 'a table mutated anywhere in the file is not constant',
      code: `const P = { email: '^ok$' }; export function load(cfg) { P.email = cfg.pattern; } export function f() { return new RegExp(P.email); }`,
      errors: 1,
    },
    {
      // A key the table does not define resolves to undefined at runtime, so
      // nothing is proven about it.
      name: 'a key the table does not define',
      code: `const P = { email: '^ok$' }; export function f() { return new RegExp(P.phone); }`,
      errors: 1,
    },
    {
      // CONTROL: the assertion does not make a runtime value constant. This is
      // the shape that makes `as` dangerous to trust — it changes the type and
      // nothing else.
      name: 'CONTROL: a request value behind a type assertion still reports',
      code: `export function f(req) { return new RegExp(req.body.p as string); }`,
      errors: 1,
    },
    {
      // CONTROL: the receiver is a call result, not a binding, so there is no
      // declaration to resolve.
      name: 'CONTROL: a lookup on a call result',
      code: `export function f() { return new RegExp(loadConfig().pattern); }`,
      errors: 1,
    },
    {
      // CONTROL: an increment is a mutation too — a hit counter on the table.
      name: 'CONTROL: a table with a counter incremented on it',
      code: `const P = { email: '^ok$', hits: 0 }; export function bump() { P.hits++; } export function f() { return new RegExp(P.email); }`,
      errors: 1,
    },
    {
      // CONTROL: `delete` is a mutation too.
      name: 'CONTROL: a table a key is deleted from',
      code: `const P = { email: '^ok$' }; export function drop() { delete P.email; } export function f() { return new RegExp(P.email); }`,
      errors: 1,
    },
    {
      // CONTROL: a value that is not a literal.
      name: 'CONTROL: a table holding a runtime value',
      code: `export function f(req) { const P = { email: req.body.p }; return new RegExp(P.email); }`,
      errors: 1,
    },
    {
      // CONTROL: computed access with a runtime key picks an unknown entry.
      name: 'CONTROL: a computed lookup with a request-chosen key',
      code: `const P = { a: '^a$', b: '^b$' }; export function f(req) { return new RegExp(P[req.body.k]); }`,
      errors: 1,
    },
  ],
});
