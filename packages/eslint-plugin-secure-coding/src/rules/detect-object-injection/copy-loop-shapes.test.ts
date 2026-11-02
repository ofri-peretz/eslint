/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Copy-loop shapes: which loops are copies of caller data, which finding a
 * copy produces (one per loop, on the keyed write), and when a loop stops
 * claiming writes. The two `objectInjection` wordings tell the copy-loop
 * finding apart from the generic keyed write.
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

const GENERIC = {
  riskLevel: 'HIGH',
  safeAlternative: 'Use Map or property whitelisting',
};
const COPY_LOOP = {
  riskLevel: 'HIGH',
  safeAlternative:
    'Guard the key before assigning: `if (k === "__proto__" || k === "constructor" || k === "prototype") continue;` — or copy with Object.create(null) / structuredClone.',
};

describe('detect-object-injection — copy-loop shapes', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'forEach with no callback copies nothing',
        code: `export function f(req) { Object.keys(req.body).forEach(); }`,
      },
      {
        name: 'an entries callback that skips the key binds none',
        code: `export function f(req) { Object.entries(req.body).forEach(([, value]) => { log(value); }); }`,
      },
      {
        name: 'an entries for-of that skips the key binds none',
        code: `export function f(req) { for (const [, value] of Object.entries(req.body)) { log(value); } }`,
      },
      {
        name: "a non-computed write that shares the key's name writes no keyed slot",
        code: `export function f(t, src) { for (const x in src) { t.x = src[x]; } }`,
      },
      {
        name: 'a const literal allowlist guards a recursive merge',
        code: `const ALLOWED = ['name', 'email'];
export function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (!ALLOWED.includes(key)) continue;
    if (typeof source[key] === 'object') merge(target[key], source[key]);
    else target[key] = source[key];
  }
}`,
      },
      {
        name: 'an ambient allowlist still guards a shallow copy',
        code: `declare const ALLOWED: string[];
export function update(user, req) {
  for (const key of Object.keys(req.body)) {
    if (!ALLOWED.includes(key)) continue;
    user[key] = req.body[key];
  }
}`,
      },
    ],
    invalid: [
      {
        name: 'one copy loop is one finding, however many writes it has',
        code: `export function update(user, req, defaults) {
  for (const key of Object.keys(req.body)) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
    else user[key] = defaults[key];
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'the finding is on the write through the KEY, not an earlier write',
        code: `export function update(user, req, log) {
  for (const key of Object.keys(req.body)) {
    log[0] = key;
    user[key] = req.body[key];
  }
}`,
        errors: [{ messageId: 'massAssignment', line: 4 }],
      },
      {
        name: 'an array hole in the loop body does not stop the walk',
        code: `export function update(user, req) {
  for (const key of Object.keys(req.body)) {
    const [, value] = [key, req.body[key]];
    user[key] = value;
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a function-expression callback copies just as an arrow does',
        code: `export function update(user, req) {
  Object.keys(req.body).forEach(function (key) { user[key] = req.body[key]; });
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'an imported keys() callback is a generic keyed write, not a mass assignment',
        code: `import { keys } from 'lodash';
export function update(user, req) { keys(req.body).forEach((key) => { user[key] = req.body[key]; }); }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: "another object's keys() callback is a generic keyed write, not a mass assignment",
        code: `export function update(user, req, helpers) { helpers.keys(req.body).forEach((key) => { user[key] = req.body[key]; }); }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: 'a for-of over an imported keys() is a generic keyed write',
        code: `import { keys } from 'lodash';
export function update(user, req) { for (const key of keys(req.body)) user[key] = req.body[key]; }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: "a for-of over another object's keys() is a generic keyed write",
        code: `export function update(user, req, helpers) { for (const key of helpers.keys(req.body)) user[key] = req.body[key]; }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: 'a for-of over values is a generic keyed write, not a mass assignment',
        code: `export function f(user, items) { for (const x of items) { user[x] = 1; } }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: 'a for-in over the host event object is a copy of caller data',
        code: `export function f(target) { for (const k in event.detail) { target[k] = event.detail[k]; } }`,
        errors: [{ messageId: 'objectInjection', data: COPY_LOOP }],
      },
      {
        name: 'a for-in over a pre-declared binding is still a copy loop',
        code: `export function f(t, src) { let k; for (k in src) t[k] = src[k]; }`,
        errors: [{ messageId: 'objectInjection', data: COPY_LOOP }],
      },
      {
        name: 'a write after a copy loop has closed is not claimed by it',
        code: `export function f(t, src, u, key) { for (key in src) { log(key); } u[key] = 1; }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: 'an inner loop that never armed does not close the outer one',
        code: `const LOCAL = { a: 1 };
export function f(t, src) {
  for (const k in src) {
    for (const j in LOCAL) { log(j); }
    t[k] = src[k];
  }
}`,
        errors: [{ messageId: 'objectInjection', data: COPY_LOOP }],
      },
      {
        name: "a keyed write through a different variable is not the copy loop's write",
        code: `export function f(t, src, other) { for (const k in src) { t[other] = 1; } }`,
        errors: [{ messageId: 'objectInjection', data: GENERIC }],
      },
      {
        name: 'a copy loop writing two targets is one finding',
        code: `export function f(a, b, src) { for (const k in src) { a[k] = src[k]; b[k] = src[k]; } }`,
        errors: [{ messageId: 'objectInjection', data: COPY_LOOP }],
      },
      {
        name: 'a let-bound allowlist can be replaced, so it guards a recursive merge no better than a parameter',
        code: `let ALLOWED = ['name', 'email'];
export function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (!ALLOWED.includes(key)) continue;
    if (typeof source[key] === 'object') merge(target[key], source[key]);
    else target[key] = source[key];
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
    ],
  });
});
