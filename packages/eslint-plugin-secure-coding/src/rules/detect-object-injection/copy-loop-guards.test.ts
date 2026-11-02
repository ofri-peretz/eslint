/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What `bodyGuardsKey` accepts as a guard on a copy loop's key, and what it
 * must not. Complements copy-loop-source.test.ts (which source is opaque) and
 * mass-assignment.test.ts (which shapes are copy loops at all).
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

describe('detect-object-injection — guards inside a copy loop', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'an allowlist test of the key wrapped in String() still names the key',
        code: `const ALLOWED = ['name', 'email'];
export function update(user, req) {
  for (const key of Object.keys(req.body)) {
    if (!ALLOWED.includes(String(key))) continue;
    user[key] = req.body[key];
  }
}`,
      },
      {
        name: "a non-computed read of a property that shares the key variable's name is not a keyed read",
        code: `export function copy(dst, src) {
  for (const name in src) {
    if (name === '__proto__') continue;
    console.log(src.name);
    dst[name] = src[name];
  }
}`,
      },
      {
        name: 'a recursive merge that rejects all three prototype keys is guarded',
        code: `export function merge(target, source) {
  for (const key in source) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof source[key] === 'object') merge(target[key], source[key]);
    else target[key] = source[key];
  }
}`,
      },
    ],
    invalid: [
      {
        name: 'a length test on the key is not a membership guard',
        code: `export function update(user, req) {
  for (const key of Object.keys(req.body)) {
    if (key.length > 0) user[key] = req.body[key];
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'skipping an ordinary field name rejects no prototype key',
        code: `export function update(user, req) {
  for (const key of Object.keys(req.body)) {
    if (key === 'id') continue;
    user[key] = req.body[key];
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a guard on one call result does not cover a write through another call result',
        code: `export function merge(req, getTarget, getSchema) {
  for (const key of Object.keys(req.body)) {
    if (!(key in getSchema())) continue;
    if (typeof req.body[key] === 'object') merge(getTarget()[key], req.body[key]);
    else getTarget()[key] = req.body[key];
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
    ],
  });
});
