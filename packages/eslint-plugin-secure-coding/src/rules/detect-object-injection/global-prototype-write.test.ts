/**
 * CWE-1321 — writing THROUGH a prototype-reaching step.
 *
 * The rule was blind to this, which is the shape the weakness is named for. Its
 * write path gated on `node.left.computed` with the comment "Dot notation
 * (obj.name) is safe", and the canonical pollution is a plain dot chain.
 *
 * ## Every expectation below was run in Node 24, not reasoned about
 *
 * The intuition is wrong in BOTH directions, which is why this file exists:
 *
 * | code                            | Object.prototype polluted? |
 * |---------------------------------|----------------------------|
 * | `o.__proto__.p = 1`             | YES                        |
 * | `o['__proto__'].p = 1`          | YES                        |
 * | `o.constructor.prototype.p = 1` | YES                        |
 * | `o.__proto__ = { p: 1 }`        | **no** — re-parents `o` only |
 * | `o.constructor = X`             | **no**                     |
 * | `fn.prototype.p = 1`            | **no** — a function's own prototype |
 * | `class C {}; C.prototype.p = 1` | **no**                     |
 * | `obj[k] = v`                    | **no** — `[[Set]]` invokes the setter |
 *
 * Two things follow. A single computed write CANNOT pollute, so the shape the
 * rule reported hardest is the one that cannot cause this. And the predicate
 * cannot be "a step named `prototype`" — `fn.prototype.method = …` is ordinary
 * prototype-based JavaScript in essentially every pre-class codebase, and
 * flagging it would be a false positive on a language idiom. `prototype` counts
 * only when reached THROUGH `constructor`.
 *
 * The distinguishing fact is FINAL vs NON-FINAL. The final property is what is
 * written TO; a non-final step is traversed, and traversal through `__proto__`
 * returns `Object.prototype` so the next write lands there.
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

describe('detect-object-injection — global prototype writes (CWE-1321)', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'ordinary prototype-based JS: a function prototype method',
        code: `function Widget() {}
Widget.prototype.render = function () { return 1; };`,
      },
      {
        name: 'ordinary prototype-based JS: patching a class prototype',
        code: `class Widget {}
Widget.prototype.render = function () { return 1; };`,
      },
      {
        name: 'FINAL __proto__ re-parents this object only — not global pollution',
        code: `const o = {};
o.__proto__ = base;`,
      },
      {
        name: 'FINAL constructor is a plain own-property write',
        code: `const o = {};
o.constructor = Ctor;`,
      },
      {
        name: 'a plain nested dot write is not a traversal of interest',
        code: `const a = { b: {} };
a.b.c = 1;`,
      },
      {
        name: 'prototype NOT reached through constructor stays quiet',
        code: `const registry = { Widget: function () {} };
registry.Widget.prototype.render = function () { return 1; };`,
      },
    ],
    invalid: [
      {
        name: 'the canonical shape — dot chain through constructor.prototype',
        code: `const o = {};
o.constructor.prototype.polluted = 1;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
      {
        // Same traversal, bracket spelling. Keying on `computed` sees only one of
        // the two and they pollute identically.
        name: 'bracket spelling of constructor.prototype',
        code: `const o = {};
o['constructor']['prototype'].polluted = 1;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
      {
        name: 'non-final __proto__, dot spelling',
        code: `const o = {};
o.__proto__.polluted = 1;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
      {
        name: 'non-final __proto__, bracket spelling',
        code: `const o = {};
o['__proto__'].polluted = 1;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
      {
        // Regression lock: this drew globalPrototypeWrite AND a generic
        // objectInjection from the MemberExpression visitor for the inner
        // computed steps. One defect, two findings is the over-reporting we
        // criticise in competitors, and the dot spelling never exposed it.
        name: 'exactly ONE finding for the bracket form, not two',
        code: `const target = {};
target['constructor']['prototype'].isAdmin = true;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
      {
        name: 'deep chain still finds the traversal',
        code: `const o = {};
o.a.b.__proto__.polluted = 1;`,
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
    ],
  });
});
