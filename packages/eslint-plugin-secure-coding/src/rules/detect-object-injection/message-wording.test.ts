/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The severity and remediation a CWE-915 finding prints.
 *
 * `OBJECT_INJECTION_PATTERNS` words a finding for the prototype accessor its key
 * names. Until 2026-11 the row was chosen by testing each accessor name as a
 * regex against the key's SOURCE TEXT, or-ed with "the key is on
 * `dangerousProperties`". That second disjunct is true for every row at once,
 * so `o['prototype'] = v` and a user-listed `o['secret'] = v` both printed the
 * `__proto__` row's advice; and the regex made `o[constructorName] = v` a
 * CRITICAL constructor finding because of how an identifier is spelled. Every
 * test asserted `messageId` only, so the wording was never checked.
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

const MAP = 'Use Map or property whitelisting';
const PROTO = 'Object.create(null) or Map';
const PROTOTYPE = 'Avoid prototype manipulation';
const CONSTRUCTOR = 'Validate property names against whitelist';
const said = (riskLevel: string, safeAlternative: string) => [
  {
    messageId: 'objectInjection' as const,
    data: { riskLevel, safeAlternative },
  },
];

describe('detect-object-injection — what a finding says', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [],
    invalid: [
      {
        name: 'a write through a caller-chosen key is HIGH, with the generic advice',
        code: `export function f(o, k, v) { o[k] = v; }`,
        errors: said('HIGH', MAP),
      },
      {
        name: 'a key spelled like an accessor is not one: o[constructorName] is HIGH, not CRITICAL',
        code: `export function f(o, constructorName, v) { o[constructorName] = v; }`,
        errors: said('HIGH', MAP),
      },
      {
        name: "a literal '__proto__' write is CRITICAL with the __proto__ advice",
        code: `export function f(o, v) { o['__proto__'] = v; }`,
        errors: said('CRITICAL', PROTO),
      },
      {
        name: "a literal 'prototype' write is CRITICAL with the prototype advice, not the __proto__ advice",
        code: `export function f(o, v) { o['prototype'] = v; }`,
        errors: said('CRITICAL', PROTOTYPE),
      },
      {
        name: "a literal 'constructor' write is CRITICAL with the constructor advice",
        code: `export function f(o, v) { o['constructor'] = v; }`,
        errors: said('CRITICAL', CONSTRUCTOR),
      },
      {
        name: 'a user-listed dangerous name is reported with the generic advice, not borrowed __proto__ advice',
        code: `export function f(o, v) { o['secret'] = v; }`,
        options: [{ dangerousProperties: ['secret'] }],
        errors: said('HIGH', MAP),
      },
      {
        name: 'an invoked read through a caller-chosen key is MEDIUM',
        code: `export function f(o, k) { return o[k](); }`,
        errors: said('MEDIUM', MAP),
      },
      {
        name: "an invoked read of '__proto__' keeps the accessor's CRITICAL level",
        code: `export function f(o) { return o['__proto__'](); }`,
        errors: said('CRITICAL', PROTO),
      },
      {
        name: "an invoked read of 'prototype' keeps the accessor's HIGH level",
        code: `export function f(o) { return o['prototype'](); }`,
        errors: said('HIGH', PROTOTYPE),
      },
      {
        name: "an invoked read of 'constructor' keeps the accessor's MEDIUM level",
        code: `export function f(o) { return o['constructor'](); }`,
        errors: said('MEDIUM', CONSTRUCTOR),
      },
    ],
  });
});
