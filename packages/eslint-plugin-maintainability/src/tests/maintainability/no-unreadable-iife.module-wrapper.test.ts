/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The classic module wrapper (expressjs/cors `lib/index.js:1`, dogfood round 2,
 * 2026-11-20): the whole file inside `(function () { 'use strict'; ...
 * module.exports = x; }());`.
 *
 * It is the one IIFE shape everyone reads, and its statement count is the size of
 * the module, so a statement cap flags every pre-ESM package. Exempt only when the
 * IIFE is itself a top-level statement AND its body assigns `module.exports` or
 * `exports.x`. The same long body as a plain block of work is still reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnreadableIife } from '../../rules/maintainability/no-unreadable-iife';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'script' },
});

const BODY = `
  'use strict';
  var assign = require('object-assign');
  var vary = require('vary');
  var defaults = { origin: '*' };
  function isString(s) { return typeof s === 'string'; }
`;

/** Where the reported call starts: at `function`, or at the `(` of an arrow IIFE. */
function invalid(code: string) {
  const at = code.includes('function () {') ? code.indexOf('function () {') : 0;
  const insert = (text: string) => code.slice(0, at) + text + code.slice(at);
  return {
    code,
    errors: [
      {
        messageId: 'unreadableIIFE' as const,
        suggestions: [
          {
            messageId: 'suggestNamedFunction' as const,
            output: insert('// TODO: Extract complex IIFE to named function\n'),
          },
          {
            messageId: 'suggestBlockScope' as const,
            output: insert(
              '// TODO: Consider using block scope { const x = ...; }\n',
            ),
          },
        ],
      },
    ],
  };
}

describe('no-unreadable-iife — the module wrapper', () => {
  ruleTester.run('module wrapper', noUnreadableIife, {
    valid: [
      {
        name: 'cors-style wrapper, module.exports =',
        code: `(function () {${BODY} module.exports = isString; }());`,
      },
      {
        name: 'call form',
        code: `(function () {${BODY} module.exports = isString; })();`,
      },
      {
        name: 'module.exports.name =',
        code: `(function () {${BODY} module.exports.isString = isString; }());`,
      },
      {
        name: 'exports.name =',
        code: `(function () {${BODY} exports.isString = isString; }());`,
      },
    ],
    invalid: [
      {
        name: 'control: a local object called exports exports nothing',
        ...invalid(
          `(function () {${BODY} var exports = {}; exports.isString = isString; }());`,
        ),
      },
      {
        name: 'control: a local object called module exports nothing',
        ...invalid(
          `(function () {${BODY} var module = {}; module.exports = isString; }());`,
        ),
      },
      {
        name: 'control: the same body with no export is plain work',
        ...invalid(`(function () {${BODY} use(isString); }());`),
      },
      {
        name: 'control: an assignment to something that is not an export',
        ...invalid(`(function () {${BODY} window.isString = isString; }());`),
      },
      {
        name: 'control: an assignment to a plain variable',
        ...invalid(`(function () {${BODY} result = isString; }());`),
      },
      {
        name: 'control: an export assignment inside a nested expression is not a wrapper',
        ...invalid(
          `foo((function () {${BODY} module.exports = isString; }()));`,
        ),
      },
      {
        name: 'control: a wrapper inside a function is not the module wrapper',
        ...invalid(
          `function load() { (function () {${BODY} module.exports = isString; }()); }`,
        ),
      },
      {
        name: 'control: a different object named exports-like',
        ...invalid(`(function () {${BODY} other.exports = isString; }());`),
      },
      {
        name: 'control: an arrow IIFE with no export',
        ...invalid(`(() => {${BODY} use(isString); })();`),
      },
    ],
  });
});
