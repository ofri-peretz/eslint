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
 * Recognised STRUCTURALLY: a `.replace()` whose search argument is a GLOBAL
 * regex literal that is one character class naming every metacharacter
 * (`\ ^ $ . * + ? ( ) [ ] { } |` — the set lodash, escape-string-regexp and MDN
 * all list). Until 2026-11-02 any class holding ONE metacharacter, with or
 * without `g`, passed; measured with `(a+)+$` against 27 `a`s and a `!`, raw
 * 5,595 ms: `/[.]/g` leaves it intact (1,314 ms), and the full class without
 * `g` escapes only the first metacharacter, so `.(a+)+$` keeps its quantifiers
 * (2,779 ms). The full class with `g`: 0.0 ms. NOT by the callee's name — a check
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
      {
        name: "lodash's escapeRegExp class is the same escape",
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/[\\\\^$.*+?()[\\]{}|]/g, '\\\\$&'));
}`,
      },
      {
        name: "escape-string-regexp's class is the same escape",
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/[|\\\\{}()[\\]^$+*?.]/g, '\\\\$&'));
}`,
      },
      {
        // lodash's own escapeRegExp holds the search in a module constant
        // (`reRegExpChar`) and replaces through it — the same regex, the same
        // 0.0 ms, one binding away.
        // @found mutation testing
        name: 'FP: the escape search held in a const binding is the same escape',
        code: `const ESC = /[.*+?^\${}()|[\\]\\\\]/g;
export function search(req) {
  return new RegExp(req.query.q.replace(ESC, '\\$&'));
}`,
      },
      {
        // replaceAll with a global regex is replace with a global regex:
        // every match is escaped (and a non-global one throws).
        // @found mutation testing
        name: 'FP: replaceAll with the escape class is the same escape',
        code: `export function search(req) {
  return new RegExp(req.query.q${ESCAPE.replace('.replace(', '.replaceAll(')});
}`,
      },
      { name: 'a string literal', code: `const re = new RegExp('^[a-z]+$');` },
      {
        name: 'a module constant is fixed at build time',
        code: `const PAT = '^[a-z]+$';
const re = new RegExp(PAT);`,
      },
      {
        name: 'constructed from a regex literal',
        code: `const re = new RegExp(/^[a-z]+$/);`,
      },
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
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // Measured 1,314 ms on `(a+)+$` (raw 5,595 ms): only `.` is touched, so
        // every quantifier and group survives.
        name: 'FN: a class that escapes only dots is not an escape',
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/[.]/g, '\\$&'));
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // Measured 2,779 ms on `.(a+)+$`: without `g` only the first match is
        // escaped, and the attacker chooses what comes first.
        name: 'FN: the full class without the g flag escapes one character',
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/[.*+?^\${}()|[\\]\\\\]/, '\\$&'));
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // A negated class matches everything EXCEPT the metacharacters, so
        // escaping its matches leaves every metacharacter bare.
        name: 'FN: a negated class escapes everything but the metacharacters',
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/[^.*+?^\${}()|[\\]\\\\]/g, '\\$&'));
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // The class is one alternative among others, not the whole search.
        name: 'FN: a metacharacter class inside a longer search is not the escape idiom',
        code: `export function search(req) {
  return new RegExp(req.query.q.replace(/x[.*+?^\${}()|[\\]\\\\]/g, '\\$&'));
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        // The binding is rebound, so the search it holds when replace runs is
        // not the one it was declared with.
        name: 'CONTROL: a let search binding that is rebound is not a proven escape',
        code: `let ESC = /[.*+?^\${}()|[\\]\\\\]/g;
ESC = /x/g;
export function search(req) {
  return new RegExp(req.query.q.replace(ESC, '\\$&'));
}`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'CONTROL: a const search binding that escapes only dots is not an escape',
        code: `const DOTS = /[.]/g;
export function search(req) {
  return new RegExp(req.query.q.replaceAll(DOTS, '\\$&'));
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
