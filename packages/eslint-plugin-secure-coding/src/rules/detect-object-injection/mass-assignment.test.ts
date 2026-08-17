/**
 * CWE-915 mass assignment, and the local-object false positive.
 *
 * ## Mass assignment is not prototype pollution
 *
 * `for (const k of Object.keys(req.body)) user[k] = req.body[k]` gives the
 * attacker no reach into `Object.prototype`. It lets them choose WHICH FIELD of
 * one object is written — measured: `user.isAdmin` goes `true`. Different
 * weakness, different blast radius, different fix (an allowlist of assignable
 * fields, not a guarded traversal), so it carries its own messageId.
 *
 * ## Which object is iterated decides safety, and it splits by weakness
 *
 * Both rows measured in Node 24:
 *
 * | key source                | pollution | mass assignment |
 * |---------------------------|-----------|-----------------|
 * | `Object.keys(target)`     | safe      | **NOT safe** — if the target already has `isAdmin`, it is still set |
 * | `Object.keys(untrusted)`  | NOT safe — `JSON.parse('{"__proto__":…}')` puts `__proto__` in `Object.keys` | NOT safe |
 *
 * So "iterates `Object.keys`" is not a suppressor on its own. This rule reports
 * only the untrusted-source form: the shape with an attacker in it.
 *
 * ## The suppression that must not become an escape hatch
 *
 * `isLocallyConstructed` exists so `const req = { params: {…} }` — a fixture, a
 * default, a test double — is not read as an inbound request. Its first version
 * looked only at the DECLARATION and silenced
 * `let key = 0; key = req.query.k; obj[key] = value`, which is numeric where it
 * is declared and attacker-controlled where it is used. The existing fixture
 * written for exactly that trap caught it. The reassignment control below is
 * kept here too, because a suppression is only as good as the case that proves
 * it stops.
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

describe('detect-object-injection — mass assignment + local-object provenance', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'an allowlist is the remediation, and it clears the finding',
        code: `export function update(req, user) {
  const ASSIGNABLE = ['name', 'email'];
  for (const k of Object.keys(req.body)) {
    if (ASSIGNABLE.includes(k)) user[k] = req.body[k];
  }
}`,
      },
      {
        name: 'a schema hasOwn guard clears it too',
        code: `export function update(req, user) {
  for (const k of Object.keys(req.body)) {
    if (Object.hasOwn(SCHEMA, k)) user[k] = req.body[k];
  }
}`,
      },
      {
        name: 'keys of a module-owned object are not caller-supplied',
        code: `const DEFAULTS = { theme: 'dark' };
export function apply(user) {
  for (const k of Object.keys(DEFAULTS)) { user[k] = DEFAULTS[k]; }
}`,
      },
      {
        name: 'a `req` this file BUILDS is a fixture, not a request',
        code: `const req = { body: { theme: 'dark' } };
export function apply(user) {
  for (const k of Object.keys(req.body)) { user[k] = req.body[k]; }
}`,
      },
      {
        name: 'reading through a locally-built `req` is not attacker-keyed',
        code: `const req = { params: { id: '1' } };
const row = table[req.params.id];`,
      },
      {
        name: 'iterating without writing is not an assignment at all',
        code: `export function log(req) {
  for (const k of Object.keys(req.body)) { console.log(k); }
}`,
      },
      {
        // Symbols cannot be this weakness — not "unlikely", impossible. A Symbol
        // is not a string, so it can never be '__proto__' or a field name a
        // caller aims at, and Object.keys does not return it. Measured on axios:
        // `socket[kAxiosCurrentReq] = null` and `obj[Symbol.iterator]` were a
        // visible share of our real-source volume.
        name: 'a module-private Symbol key',
        code: `const kTag = Symbol('tag');
export function tag(socket) { socket[kTag] = null; }`,
      },
      {
        name: 'a well-known Symbol from the protocol',
        code: `export function iterate(obj) { return obj && obj[Symbol.iterator]; }`,
      },
      {
        name: 'Symbol.for is the registry form of the same thing',
        code: `const kShared = Symbol.for('app.tag');
export function tag(o) { o[kShared] = 1; }`,
      },
      {
        // A source rooted at a CALL, not an identifier. The file cannot show
        // where it came from, so there is no request root to match — and
        // guessing from `getBody`'s spelling is the defect this ecosystem gates
        // against. Quiet is the correct answer; the finding belongs to whatever
        // taints the call's result, not to a name.
        name: 'a source the file cannot root is not asserted untrusted',
        code: `export function update(user) {
  for (const k of Object.keys(getBody())) { user[k] = getBody()[k]; }
}`,
      },
      {
        // Test files are exempt across this rule — a fixture that builds a
        // polluted object on purpose is the test, not the vulnerability.
        name: 'test files are exempt',
        filename: 'update.test.ts',
        code: `export function update(req, user) {
  for (const k of Object.keys(req.body)) { user[k] = req.body[k]; }
}`,
      },
      {
        // An ObjectPattern binding destructures the ENTRY, not the key, so
        // there is no key identifier to follow into the body.
        name: 'an object-pattern binding yields no key name',
        code: `export function update(req, user) {
  for (const { length } of Object.entries(req.body)) { user[length] = 1; }
}`,
      },
    ],
    invalid: [
      {
        name: 'the canonical shape — every caller key copied onto a target',
        code: `export function update(req, user) {
  for (const k of Object.keys(req.body)) { user[k] = req.body[k]; }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        // The more idiomatic spelling — it avoids the second lookup — and the
        // first implementation missed it, because the binding is an ArrayPattern
        // rather than an Identifier.
        name: 'Object.entries with array destructuring',
        code: `export function update(req, user) {
  for (const [k, v] of Object.entries(req.body)) { user[k] = v; }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'the write nested inside a conditional still counts',
        code: `export function update(req, user, ok) {
  for (const k of Object.keys(req.body)) {
    if (ok) { user[k] = req.body[k]; }
  }
}`,
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        // `for (k of …)` with no declaration — the binding assigns to an outer
        // variable, so the loop check declines (it has no declared key to
        // follow). It is NOT a hole: the generic computed-access path still
        // reports both the write and the read.
        //
        // I first asserted this as `valid`, reasoning "out of scope for the loop
        // check" and forgetting the rule has four report paths. The failure was
        // my expectation, not the rule — worth keeping as the case that says so.
        name: 'an undeclared loop binding falls through to the generic path',
        code: `let k;
export function update(req, user) {
  for (k of Object.keys(req.body)) { user[k] = req.body[k]; }
}`,
        errors: [{ messageId: 'objectInjection' }, { messageId: 'objectInjection' }],
      },
      {
        // CONTROL for the Symbol suppression. Declared a Symbol, reassigned to a
        // request value before use — a suppression that reads only the
        // declaration would silence a real finding here, which is the same trap
        // isLocallyConstructed fell into.
        name: 'CONTROL: a Symbol binding reassigned to a string still reports',
        code: `let k = Symbol('t');
k = req.query.k;
socket[k] = null;`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // CONTROL for isLocallyConstructed. Numeric at the declaration,
        // attacker-controlled by the time the access runs. A suppression that
        // reads only the declaration silences this — which it did, once.
        name: 'CONTROL: a reassigned key is not saved by its initialiser',
        code: `let key = 0;
key = req.query.k;
obj[key] = value;`,
        errors: [{ messageId: 'objectInjection' }],
      },
    ],
  });
});
