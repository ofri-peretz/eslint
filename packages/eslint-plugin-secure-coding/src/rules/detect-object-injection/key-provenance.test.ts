/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a key comes from, and which provenance proves it cannot name a
 * prototype accessor: literal lists, numeric expressions, Object.keys
 * callbacks, const tables, imports.
 *
 * One false positive closed 2026-11: an inline `['a', 'b'].forEach((k) => …)`
 * was refused because its receiver was not an identifier, though the same list
 * bound to a const was accepted.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const reported = [{ messageId: 'objectInjection' as const }];

describe('detect-object-injection — key provenance', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        // @found mutation testing
        name: 'FP: an inline array literal of strings decides its own forEach keys',
        code: `export function f(o) { ['a', 'b'].forEach((k) => { o[k] = 1; }); }`,
      },
      {
        name: 'a frozen const list of strings decides the loop keys',
        code: `const LIST = Object.freeze(['a', 'b']);
export function f(o) { for (const k of LIST) o[k] = 1; }`,
      },
      {
        name: 'a | b is a number',
        code: `export function f(o, a, b, v) { o[a | b] = v; }`,
      },
      {
        name: 'a & b is a number',
        code: `export function f(o, a, b, v) { o[a & b] = v; }`,
      },
      {
        name: 'a ^ b is a number',
        code: `export function f(o, a, b, v) { o[a ^ b] = v; }`,
      },
      {
        name: 'a << b is a number',
        code: `export function f(o, a, b, v) { o[a << b] = v; }`,
      },
      {
        name: 'a >> b is a number',
        code: `export function f(o, a, b, v) { o[a >> b] = v; }`,
      },
      {
        name: 'a >>> b is a number',
        code: `export function f(o, a, b, v) { o[a >>> b] = v; }`,
      },
      {
        name: 'a * b is a number',
        code: `export function f(o, a, b, v) { o[a * b] = v; }`,
      },
      {
        name: 'a / b is a number',
        code: `export function f(o, a, b, v) { o[a / b] = v; }`,
      },
      {
        name: 'a % b is a number',
        code: `export function f(o, a, b, v) { o[a % b] = v; }`,
      },
      {
        name: 'a ** b is a number',
        code: `export function f(o, a, b, v) { o[a ** b] = v; }`,
      },
      {
        name: 'bitwise NOT makes a number',
        code: `export function f(o, k, v) { o[~k] = v; }`,
      },
      {
        name: 'unary minus makes a number',
        code: `export function f(o, k, v) { o[-k] = v; }`,
      },
      {
        name: 'unary plus makes a number',
        code: `export function f(o, k, v) { o[+k] = v; }`,
      },
      {
        name: 'Number() makes a number',
        code: `export function f(o, k, v) { o[Number(k)] = v; }`,
      },
      {
        name: 'parseInt() makes a number',
        code: `export function f(o, k, v) { o[parseInt(k)] = v; }`,
      },
      {
        name: 'parseFloat() makes a number',
        code: `export function f(o, k, v) { o[parseFloat(k)] = v; }`,
      },
      {
        name: 'the third reduce parameter is the index',
        code: `export function f(xs: string[], o) { return xs.reduce((acc, x, i) => { o[i] = x; return acc; }, 0); }`,
      },
      {
        name: 'the third reduceRight parameter is the index',
        code: `export function f(xs: string[], o) { return xs.reduceRight((acc, x, i) => { o[i] = x; return acc; }, 0); }`,
      },
      {
        name: 'slice() returns an array, so its forEach index is a number',
        code: `export function f(xs, o) { xs.slice(0).forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: 'Array.from() returns an array',
        code: `export function f(n, o) { Array.from(n).forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: 'Array.of() returns an array',
        code: `export function f(a, b, o) { Array.of(a, b).forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: 'a readonly array parameter is an array',
        code: `export function f(xs: readonly string[], o) { xs.forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: 'an Array<T> parameter is an array',
        code: `export function f(xs: Array<string>, o) { xs.forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: 'a ReadonlyArray<T> parameter is an array',
        code: `export function f(xs: ReadonlyArray<string>, o) { xs.forEach((x, i) => { o[i] = x; }); }`,
      },
      {
        name: "a function-expression callback's index is a number too",
        code: `export function f(xs: string[], o) { xs.forEach(function (x, i) { o[i] = x; }); }`,
      },
      {
        name: 'a for-in over a host global is not a copy loop the rule can source',
        code: `export function f(target) { for (const k in name) { target[k] = name[k]; } }`,
        languageOptions: { globals: { name: 'readonly' } },
      },
      {
        name: 'a function-expression Object.keys callback binds a key',
        code: `export function f(o) { const src = { a: 1 }; Object.keys(src).forEach(function (k) { o[k] = src[k]; }); }`,
      },
      {
        name: 'an update through a const object literal touches a slot the file wrote',
        code: `const counts = { a: 0 };
export function f(k) { counts[k]++; }`,
      },
      {
        name: 'a key looked up in a const table of string literals is one of them',
        code: `const MAP = { a: 'x', b: 'y' };
export function f(o, input, v) { const key = MAP[input]; o[key] = v; }`,
      },
      {
        name: 'an imported binding of any spelling is a module constant',
        code: `import { fieldName } from './fields';
export function f(o, v) { o[fieldName] = v; }`,
      },
      {
        name: 'an invoked keyed read in a codemod is AST traversal',
        code: `export function f(node, name) { return node[name](); }`,
        filename: 'tools/codemods/visit.ts',
      },
      {
        name: 'Object.assign() with no arguments copies nothing',
        code: `export function f() { return Object.assign(); }`,
      },
    ],
    invalid: [
      {
        name: 'a caught value is not drawn from a literal list',
        code: `export function f(o, v) { try { run(); } catch (k) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: "another object's freeze() is not Object.freeze",
        code: `export function f(o, cfg) { for (const k of cfg.freeze(['a'])) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'Object.assign over a list lets the second argument overwrite its elements',
        code: `export function f(o, extra) { for (const k of Object.assign(['a'], extra)) o[k] = 1; }`,
        errors: [
          { messageId: 'objectInjection' },
          { messageId: 'objectInjection' },
        ],
      },
      {
        name: 'Object.freeze() with no argument freezes no list',
        code: `export function f(o) { for (const k of Object.freeze()) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'a list passed in as a parameter is not a literal the file wrote',
        code: `export function f(o, LIST) { for (const k of LIST) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: "a const bound to another object's freeze() is not a frozen literal",
        code: `const LIST = cfg.freeze(['a']);
export function f(o) { for (const k of LIST) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'a const bound to Object.assign over a list is not that list',
        code: `const LIST = Object.assign(['a'], extra);
export function f(o) { for (const k of LIST) o[k] = 1; }`,
        errors: [
          { messageId: 'objectInjection' },
          { messageId: 'objectInjection' },
        ],
      },
      {
        name: 'a const bound to an empty Object.freeze() is not a list',
        code: `const LIST = Object.freeze();
export function f(o) { for (const k of LIST) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'a list with a hole yields undefined, which is not one of its literals',
        code: `export function f(o) { for (const k of ['a', , 'b']) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'a method of another namespace is not a Math method',
        code: `import path from 'node:path';
export function f(o, file, v) { o[path.basename(file)] = v; }`,
        errors: reported,
      },
      {
        name: 'an index-shaped parameter of a callback to an unknown function is not an index',
        code: `export function f(run, o) { run((x, i) => { o[i] = x; }); }`,
        errors: reported,
      },
      {
        name: 'the ELEMENT of a string array is a string, not an index',
        code: `export function f(xs: string[], o) { xs.forEach((x, i) => { o[x] = i; }); }`,
        errors: reported,
      },
      {
        name: 'a host global such as window.name is caller-controlled',
        code: `export function f(o, v) { o[name] = v; }`,
        languageOptions: { globals: { name: 'readonly' } },
        errors: reported,
      },
      {
        name: 'the value half of an Object.entries pair is not a key',
        code: `export function f(o, src) { Object.entries(src).forEach(([k, val]) => { o[val] = 1; }); }`,
        errors: reported,
      },
      {
        name: 'the value of an Object.entries pair whose key is skipped is not a key',
        code: `export function f(o, src) { Object.entries(src).forEach(([, val]) => { o[val] = 1; }); }`,
        errors: reported,
      },
      {
        name: 'a callback to a bare function is not an Object.keys callback',
        code: `export function f(o, each) { each((k) => { o[k] = 1; }); }`,
        errors: reported,
      },
      {
        name: 'an imported keys() is not Object.keys',
        code: `import { keys } from 'lodash';
export function f(o, src) { keys(src).forEach((k) => { o[k] = 1; }); }`,
        errors: reported,
      },
      {
        name: "another object's keys() is not Object.keys",
        code: `export function f(o, src, helpers) { helpers.keys(src).forEach((k) => { o[k] = 1; }); }`,
        errors: reported,
      },
      {
        name: 'Object.values yields attacker VALUES, not keys',
        code: `export function f(o, src) { Object.values(src).forEach((v) => { o[v] = 1; }); }`,
        errors: reported,
      },
      {
        name: "a for-of over another object's keys() is not over Object.keys",
        code: `export function f(o, src, helpers) { for (const k of helpers.keys(src)) o[k] = 1; }`,
        errors: reported,
      },
      {
        name: 'a let-bound table can be replaced, so it is not the literal',
        code: `let counts = { a: 0 };
export function f(k) { counts[k]++; }`,
        errors: reported,
      },
      {
        name: 'a const array is not a const object table',
        code: `const counts = [0, 0];
export function f(k) { counts[k]++; }`,
        errors: reported,
      },
      {
        name: 'an ambient declaration has no literal behind it',
        code: `declare const counts: Record<string, number>;
export function f(k) { counts[k]++; }`,
        errors: reported,
      },
      {
        name: "a table passed in as a parameter is not the file's literal",
        code: `export function f(counts, k) { counts[k]++; }`,
        errors: reported,
      },
      {
        name: 'a let-bound lookup result can be reassigned',
        code: `const MAP = { a: 'x', b: 'y' };
export function f(o, input, v) { let key = MAP[input]; o[key] = v; }`,
        errors: reported,
      },
      {
        name: 'a table with one non-literal value can yield that value',
        code: `const MAP = { a: 'x', b: process.env.B };
export function f(o, input, v) { const key = MAP[input]; o[key] = v; }`,
        errors: reported,
      },
      {
        name: 'a table that spreads another object can yield anything that object holds',
        code: `const MAP = { ...BASE, a: 'x' };
export function f(o, input, v) { const key = MAP[input]; o[key] = v; }`,
        errors: reported,
      },
      {
        name: 'a value returned by a method call is not a Symbol',
        code: `export function f(o, v, headers) { const key = headers.get('x-field'); o[key] = v; }`,
        errors: reported,
      },
    ],
  });
});
