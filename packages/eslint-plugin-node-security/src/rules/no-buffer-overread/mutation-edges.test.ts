/**
 * no-buffer-overread — the edges Stryker found unpinned.
 *
 * Each case states one claim about the rule's documented behaviour. Most of
 * the loop, guard-shape and constant cases run under `reportUnvalidatedIndices`,
 * because under the default an untainted index is never reported and a
 * `valid` case there proves nothing about the exemption it names.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noBufferOverread } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const UNVALIDATED = [{ reportUnvalidatedIndices: true }];

describe('no-buffer-overread mutation edges', () => {
  ruleTester.run('no-buffer-overread', noBufferOverread, {
    valid: [
      // ── what counts as a buffer ──────────────────────────────────────────
      {
        name: 'a local named bytes bound to an array is not a Buffer',
        code: `export function pick(req, text) {
  const bytes = text.split('');
  return bytes[req.query.i];
}`,
      },
      {
        name: 'Array.from returns an array, not a Buffer',
        code: `export function pick(req, list) {
  const items = Array.from(list);
  return items[req.query.i];
}`,
      },
      {
        name: 'a method called on a property chain is not a tracked Buffer receiver',
        code: `export const snapshot = (doc) => doc.history.copy();`,
      },

      // ── writes are CWE-787, not this rule ────────────────────────────────
      {
        name: 'an increment of a buffer element is a write',
        code: `export function bump(req, buf) { buf[req.query.i]++; }`,
      },
      {
        name: "a write's value argument is not an offset",
        code: `export function setLevel(req, buf) { buf.writeUInt8(req.body.level, 0); }`,
      },
      {
        name: "copy's target buffer is not an offset",
        code: `export const dup = (buf, target) => buf.copy(target, 0);`,
        options: UNVALIDATED,
      },

      // ── loop counters ────────────────────────────────────────────────────
      {
        name: 'a for-loop counter bounded with < is not reported under the sweep',
        code: `export function sum(buf, n) {
  let s = 0;
  for (let i = 0; i < n; i++) s += buf[i];
  return s;
}`,
        options: UNVALIDATED,
      },
      {
        name: 'a for-loop counter bounded with <= is not reported under the sweep',
        code: `export function sum(buf, last) {
  let s = 0;
  for (let i = 0; i <= last; i++) s += buf[i];
  return s;
}`,
        options: UNVALIDATED,
      },
      {
        name: 'a while-loop counter bounded with < is not reported under the sweep',
        code: `export function sum(buf, n) {
  let s = 0;
  let i = 0;
  while (i < n) { s += buf[i]; i++; }
  return s;
}`,
        options: UNVALIDATED,
      },

      // ── constants ────────────────────────────────────────────────────────
      {
        name: 'BUG: a const-aliased offset is a provable index under the sweep',
        code: `const OFF = 4;
export const f = (buf) => buf[OFF];`,
        options: UNVALIDATED,
      },
      {
        name: 'BUG: a string-literal key is not an unvalidated index under the sweep',
        code: `export const size = (bytes) => bytes['length'];`,
        options: UNVALIDATED,
      },
      {
        name: 'index 0 is a provable index under the sweep',
        code: `export const first = (buf) => buf[0];`,
        options: UNVALIDATED,
      },
      {
        name: 'a sum of constants is a provable offset',
        code: `const HEADER = 4;
export const f = (buf) => buf.slice(HEADER + 2);`,
        options: UNVALIDATED,
      },
      {
        name: 'the same const alias read twice in one sum still resolves',
        code: `const W = 2;
export const f = (buf) => buf.readUInt16LE(W + W);`,
        options: UNVALIDATED,
      },

      // ── guards ───────────────────────────────────────────────────────────
      {
        name: 'a length guard at module level guards a module-level read',
        code: `const i = req.query.i;
if (i < buf.length) send(buf[i]);`,
      },
      {
        name: 'a clamp of the index compared against the length is a guard',
        code: `export function at(req, buf) {
  const i = req.query.i;
  if (Math.max(0, i) >= buf.length) return;
  return buf[i];
}`,
      },
      {
        name: 'BUG: a guard against byteLength is a bounds check',
        code: `export function at(req) {
  const view = new Uint8Array(16);
  const i = req.query.i;
  if (i >= view.byteLength) return;
  return view[i];
}`,
      },

      // ── noAssert ─────────────────────────────────────────────────────────
      {
        name: 'a trailing true on a method that is not a Buffer read or write is not noAssert',
        code: `export const remember = (cache, key) => cache.set(key, true);`,
      },
      {
        name: 'a method that only contains "write" mid-name is not a Buffer write',
        code: `export const f = (r, html) => r.rewriteUrls(html, true);`,
      },
      {
        name: 'a single boolean argument is the value written, not noAssert',
        code: `export const f = (w) => w.writeBool(true);`,
      },
    ],
    invalid: [
      // ── what counts as a buffer ──────────────────────────────────────────
      {
        name: 'fs.readFileSync(path) through the module object returns a Buffer',
        code: `const blob = fs.readFileSync('/var/lib/app/blob.bin');
export function h(req) { return blob.slice(Number(req.query.start)); }`,
        errors: [{ messageId: 'unsafeBufferSlice' }],
      },
      {
        name: 'a declared global named buf is a Buffer by convention',
        code: `/* global buf */
export const h = (req) => buf[req.query.i];`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a subarray of a Buffer is a Buffer',
        code: `export function header(req) {
  const data = Buffer.alloc(64);
  const head = data.subarray(0, 8);
  return head[req.query.i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },

      // ── reads ────────────────────────────────────────────────────────────
      {
        name: 'a buffer element on the right of an assignment is a read',
        code: `export function h(req, buf) {
  let v;
  v = buf[req.query.i];
  return v;
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },

      // ── loop counters ────────────────────────────────────────────────────
      {
        name: 'a count-down loop bounds the counter only from below',
        code: `export function sum(buf, n) {
  let s = 0;
  for (let i = n; i > 0; i--) s += buf[i];
  return s;
}`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'a loop bounding a different counter does not bound this index',
        code: `export function sum(buf, rows) {
  let s = 0;
  let at = 0;
  for (let row = 0; row < rows; row++) s += buf[at];
  return s;
}`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },

      // ── indices the sweep cannot prove ───────────────────────────────────
      {
        name: 'a declared global index is reported under the sweep',
        code: `/* global offset */
export const h = (buf) => buf[offset];`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'a declared global index reaches the trustedSanitizers check without an initializer',
        code: `export const h = () => buf[cursor];`,
        options: [
          { reportUnvalidatedIndices: true, trustedSanitizers: ['clamp'] },
        ],
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'a curried helper call names no bounds helper and no sanitizer',
        code: `export function h(buf, raw) {
  const off = clampTo(64)(raw);
  return buf[off];
}`,
        options: [
          { reportUnvalidatedIndices: true, trustedSanitizers: ['clamp'] },
        ],
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'a library max over an array is not the Math clamp',
        code: `export const h = (buf, offsets) => buf[lodash.max(offsets)];`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },
      {
        name: 'a negated unknown is not a provable offset',
        code: `export const tail = (buf, n) => buf.slice(-n);`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferSlice' }],
      },
      {
        name: 'a bitwise-not offset is not a number this rule evaluates',
        code: `const MASK = 3;
export const f = (buf) => buf.readUInt8(~MASK);`,
        options: UNVALIDATED,
        errors: [{ messageId: 'missingBoundsCheck' }],
      },
      {
        name: 'a constant plus an unknown is not a provable offset',
        code: `const HEADER = 4;
export const f = (buf, len) => buf.slice(HEADER + len);`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferSlice' }],
      },
      {
        name: 'a cycle of const aliases resolves to nothing, and terminates',
        code: `const A = B + 1;
const B = A - 1;
export const v = (buf) => buf[A];`,
        options: UNVALIDATED,
        errors: [{ messageId: 'unsafeBufferAccess' }],
      },

      // ── negative constants ───────────────────────────────────────────────
      {
        name: 'BUG: a const alias chain longer than six still resolves to its negative value',
        code: `const BACK = -1;
const A1 = BACK;
const A2 = A1;
const A3 = A2;
const A4 = A3;
const A5 = A4;
const A6 = A5;
const A7 = A6;
export const last = buf[A7];`,
        errors: [{ messageId: 'negativeBufferIndex' }],
      },
      {
        name: 'a unary plus keeps a negative constant negative',
        code: `const BACK = -2;
export const f = () => buf[+BACK];`,
        errors: [{ messageId: 'negativeBufferIndex' }],
      },

      // ── guards that are not guards ───────────────────────────────────────
      {
        name: 'a length check that does not mention the index is not a guard',
        code: `export function at(req, buf) {
  const i = req.query.i;
  if (buf.length < 4) return;
  return buf[i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a non-helper call on the index in an if is not a guard',
        code: `export function at(req, buf) {
  const i = req.query.i;
  if (!Number.isInteger(i)) return;
  return buf[i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a call that does not take the index does not mention it',
        code: `export function at(req, buf, other) {
  const i = req.query.i;
  if (count(other) > buf.length) return;
  return buf[i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a sum of other values does not mention the index',
        code: `export function at(req, buf, len) {
  const i = req.query.i;
  if (len + 1 > buf.length) return;
  return buf[i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a property of another object does not mention the index',
        code: `export function at(req, buf, header) {
  const i = req.query.i;
  if (header.size > buf.length) return;
  return buf[i];
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: "a guard on a same-named parameter's length does not guard the module-level buffer",
        code: `const i = req.query.i;
function fits(buf) { return i < buf.length; }
export const v = buf[i];`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a length guard on an outer same-named buffer does not guard a block-scoped one',
        code: `const i = req.query.i;
if (i < buf.length) send(buf[i]);
{
  const buf = Buffer.alloc(4);
  send(buf[i]);
}`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a guard in a sibling function declaration does not guard this one',
        code: `const i = req.query.i;
export function read() { return buf[i]; }
export function check() { return i < buf.length; }`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a guard in a sibling function expression does not guard this one',
        code: `const i = req.query.i;
export const read = function () { return buf[i]; };
export function check() { return i < buf.length; }`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
      {
        name: 'a guard in a sibling arrow function does not guard this one',
        code: `const i = req.query.i;
export const read = () => buf[i];
export function check() { return i < buf.length; }`,
        errors: [{ messageId: 'userControlledBufferIndex' }],
      },
    ],
  });
});
