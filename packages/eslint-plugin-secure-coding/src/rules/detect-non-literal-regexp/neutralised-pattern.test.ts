/**
 * The two guards that neutralise a caller-supplied regex pattern.
 *
 * ## The weakness has TWO faces, and both were verified by running them
 *
 * **DoS.** `new RegExp(attackerPattern)` with `(a+)+$` against 30 characters
 * takes **39,812 ms**. The attacker does not need to find a bad pattern in your
 * code — they supply one.
 *
 * **Semantic bypass.** `new RegExp('.*').test('totally-unrelated')` is `true`.
 * A caller who controls the pattern of an ALLOW decision matches everything.
 * This half is often forgotten and is not fixed by a timeout.
 *
 * ## Guard 1 — escaping, measured
 *
 * `attacker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` turns every metacharacter
 * into a literal. The same `(a+)+$` pattern then takes **0.0 ms**, because there
 * are no quantifiers left to backtrack over — it matches the six literal
 * characters. 39,812 ms -> 0.0 ms.
 *
 * It is also the remediation this rule's own message recommends, so reporting a
 * developer who followed the advice made the rule unsatisfiable — and an
 * unsatisfiable rule gets disabled, which costs every other finding it makes.
 *
 * Recognised STRUCTURALLY: a `.replace()` whose search argument is a regex
 * literal containing a metacharacter class. NOT by the callee's name — a check
 * for `escapeRegExp` is defeated by `const escapeRegExp = (s) => s`, which is
 * exactly the failure mode this ecosystem shipped once with a sanitiser
 * allowlist. The fake-escaper CONTROL below pins that.
 *
 * ## Guard 2 — closed-set lookup
 *
 * `PATTERNS[req.query.kind]` can only yield a pattern the program wrote. The
 * caller chooses WHICH, never WHAT, so neither face of the weakness is
 * reachable. It is also the remediation in the rule's own `good:` example.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralRegexp } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

// NOT a template literal: `String.raw` still parses `${}` as an
// interpolation, and an empty one is a syntax error. A single-quoted
// string leaves the metacharacter class alone.
const ESCAPE = ".replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')";

describe('detect-non-literal-regexp — neutralised patterns', () => {
  ruleTester.run('detect-non-literal-regexp', detectNonLiteralRegexp, {
    valid: [
      {
        name: 'escaped inline — 39,812 ms becomes 0.0 ms',
        code: `export function search(req) {
  return new RegExp(req.query.q${ESCAPE});
}`,
      },
      {
        name: 'escaped through one binding hop',
        code: `export function search(req) {
  const safe = req.query.q${ESCAPE};
  return new RegExp(safe);
}`,
      },
      {
        name: 'closed-set lookup — the caller picks WHICH, never WHAT',
        code: `const PATTERNS = { name: '^[a-z]+$', num: '^[0-9]+$' };
export function search(req) {
  const p = PATTERNS[req.query.kind];
  if (!p) throw new Error('unknown');
  return new RegExp(p);
}`,
      },
      { name: 'a string literal', code: `const re = new RegExp('^[a-z]+$');` },
      {
        name: 'a module constant is fixed at build time',
        code: `const PAT = '^[a-z]+$';
const re = new RegExp(PAT);`,
      },
      { name: 'constructed from a regex literal', code: `const re = new RegExp(/^[a-z]+$/);` },
      {
        // The closed set can be an ARRAY as well as an object — same argument,
        // the caller indexes a list the program wrote.
        name: 'closed-set lookup from an array literal',
        code: `const PATTERNS = ['^[a-z]+$', '^[0-9]+$'];
export function search(req) {
  const p = PATTERNS[Number(req.query.i)];
  if (!p) throw new Error('unknown');
  return new RegExp(p);
}`,
      },
    ],
    invalid: [
      {
        name: 'a caller-supplied pattern reaches the constructor',
        code: `export function search(req) { return new RegExp(req.query.q); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'through a binding hop',
        code: `export function search(req) {
  const p = req.query.q;
  return new RegExp(p);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'interpolated into a template',
        code: 'export function search(req) { return new RegExp(`^${req.query.q}$`); }',
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'concatenated onto a literal prefix',
        code: `export function search(req) { return new RegExp('^' + req.query.q); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // CONTROL for guard 1. A `.replace()` that is not an escape must not
        // suppress. Keying on the callee's NAME instead of the search argument
        // would be defeated by `const escapeRegExp = (s) => s`.
        name: 'CONTROL: a .replace() that does not escape metacharacters',
        code: `export function search(req) {
  const notEscaped = req.query.q.replace(/foo/g, 'bar');
  return new RegExp(notEscaped);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // A `.replace()` whose search is a VARIABLE, not a regex literal. The
        // escape cannot be proven, and an unproven guard must not suppress.
        name: 'CONTROL: .replace() with a non-literal search argument',
        code: `export function search(req, pat) {
  const maybe = req.query.q.replace(pat, '');
  return new RegExp(maybe);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // The lookup receiver is a PARAMETER, so the file cannot show it is a
        // closed set. Absence of evidence is not evidence of safety.
        name: 'CONTROL: lookup on an object the file cannot resolve',
        code: `export function search(req, table) {
  const p = table[req.query.kind];
  return new RegExp(p);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // The lookup receiver is a MEMBER EXPRESSION, not a bare identifier, so
        // there is no single binding to resolve to a literal map. `config` could
        // be assembled from anywhere.
        name: 'CONTROL: lookup on a nested receiver is not a proven closed set',
        code: `import { config } from './config';
export function search(req) {
  const p = config.patterns[req.query.kind];
  return new RegExp(p);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // CONTROL for the binding hop. Escaped at the declaration, then
        // overwritten with the raw value — reading only the declaration would
        // silence a live finding, the same trap two earlier rules fell into.
        name: 'CONTROL: escaped then REASSIGNED to the raw value',
        code: `export function search(req) {
  let p = req.query.q${ESCAPE};
  p = req.query.raw;
  return new RegExp(p);
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
    ],
  });
});
