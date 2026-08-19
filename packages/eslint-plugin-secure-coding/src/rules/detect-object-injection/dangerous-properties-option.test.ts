/**
 * `dangerousProperties` as a (shape × setting) MATRIX.
 *
 * ## Why this file exists
 *
 * The option was reported as dead after one probe: `function f(o,k){ o[k]=1 }`
 * gave the same result unset, `[]`, and `['__proto__']`. That conclusion was
 * wrong. The option works — on a shape that probe never used.
 *
 * An option is a function of (shape × setting). One cell proves nothing about
 * the others, and every previous test for this option exercised a single shape,
 * which is how the rule header came to claim the option "decides whether to
 * report" when it reaches exactly one of four report paths:
 *
 * | shape                          | default | `[]`   | `['__proto__']` |
 * |--------------------------------|---------|--------|-----------------|
 * | `o['__proto__'] = x` literal   | reports | SILENT | reports         |
 * | `o[k] = 1` dynamic key         | reports | reports| reports         |
 * | `cfg[req.query.k]` dynamic read| reports | reports| reports         |
 * | `o.constructor.prototype.p = 1`| reports | reports| reports         |
 *
 * Rows 2 and 3 are not a bug: a dynamic key has no name to compare against a
 * list, so the option cannot apply. Row 4 is deliberate — the CWE-1321
 * traversal is a fact about the language, and letting a consumer set `[]` to
 * silence a critical process-wide finding would be a footgun, not a knob.
 *
 * The defect was the CONTRACT, not the code. It is corrected in the schema
 * description and the Options interface, and pinned here.
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

describe('detect-object-injection — dangerousProperties (shape x setting)', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        // Moved from `invalid` 2026-08-19. The point of the case is unchanged —
        // `dangerousProperties: []` cannot silence a DYNAMIC key, because there
        // is no name to compare against the list. What changed is that a read is
        // no longer a finding at all, so the option's irrelevance now shows up
        // as silence for a second, independent reason.
        name: 'a dynamic READ is out of the option\'s scope — and reads cannot pollute',
        code: `export function g(req) { return config[req.query.key]; }`,
        options: [{ dangerousProperties: [] }],
      },

      {
        // THE cell that proves the option does something. Remove the option
        // plumbing and this reports, which is what makes it a lock rather than
        // a description.
        name: 'setting [] SILENCES the literal dangerous-property write',
        code: `const o = {};
o['__proto__'] = payload;`,
        options: [{ dangerousProperties: [] }],
      },
      {
        name: 'a name removed from the list stops being dangerous',
        code: `const o = {};
o['prototype'] = payload;`,
        options: [{ dangerousProperties: ['__proto__'] }],
      },
    ],
    invalid: [
      {
        name: 'DEFAULT: the literal write reports with no options at all',
        code: `const o = {};
o['__proto__'] = payload;`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'DEFAULT: a name still on the list keeps reporting',
        code: `const o = {};
o['prototype'] = payload;`,
        options: [{ dangerousProperties: ['__proto__', 'prototype'] }],
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // Rows 2-4 of the matrix: the option is out of scope for these, and
        // asserting so is what stops the contract drifting back.
        name: 'a DYNAMIC key has no name to compare — [] cannot silence it',
        code: `function f(o, k) { o[k] = 1; }`,
        options: [{ dangerousProperties: [] }],
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'CWE-1321 traversal is a language fact, not a tunable vocabulary',
        code: `const o = {};
o.constructor.prototype.polluted = 1;`,
        options: [{ dangerousProperties: [] }],
        errors: [{ messageId: 'globalPrototypeWrite' }],
      },
    ],
  });
});
