/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two initialiser shapes this rule could not see through.
 *
 * Measured 2026-08-20 with `scripts/preset-sweep.mts` over the 20-repository
 * corpus: this rule produced 157,699 findings — **56% of everything
 * `recommended` reports across all 30 plugins**, and more than the other 150
 * firing rules combined. Two shapes accounted for a tenth of it, both of them
 * values the rule already treats as non-null when written differently:
 *
 *   `var pets = exports.pets = []`   the declarator's init is the ASSIGNMENT,
 *                                    so the array literal two tokens away was
 *                                    never inspected
 *   `const u = require('u')`         the CommonJS twin of ImportBinding, which
 *                                    already returns true. A failed `require`
 *                                    THROWS; it does not evaluate to null, so a
 *                                    module object is at least as non-null as
 *                                    an ESM import binding
 *
 * Honest about scope: fixing both removed 2,977 of 29,814 findings over 4,000
 * corpus files — 10%. The remaining volume is not these bugs. It is the rule
 * reporting any member access it cannot prove non-null, which in untyped JS is
 * most member accesses, and that is a question about whether the rule belongs
 * in `recommended` rather than one more shape to special-case.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noMissingNullChecks } from '../../rules/reliability/no-missing-null-checks';

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

ruleTester.run('no-missing-null-checks — module values', noMissingNullChecks, {
  valid: [
    {
      name: 'a chained assignment to exports still resolves to the array',
      code: `var pets = exports.pets = [];\npets.push({ id: 0 });`,
    },
    {
      name: 'a chained assignment to a local resolves too',
      code: `var a;\nvar pets = a = [];\npets.push({ id: 0 });`,
    },
    {
      name: 'a required module is not null',
      code: `const u = require('u');\nu.go();`,
    },
    {
      name: 'a required module reached through two dots is not null',
      code: `const u = require('u');\nconst x = u.a.b;`,
    },
    {
      // CONTROL for the ESM half that already worked, so the two stay aligned.
      name: 'an imported binding is not null',
      code: `import u from 'u';\nu.go();`,
    },
  ],
  invalid: [
    {
      // FN GUARD: `require` must be THE global. A local function of that name
      // carries none of the contract, so the spelling alone proves nothing —
      // this is why the fix resolves the binding instead of matching the name.
      name: 'a locally-defined require is just a function',
      code: `function require(x) { return null; }\nconst u = require('u');\nu.go();`,
      errors: 1,
    },
    {
      // FN GUARD: `||=` can evaluate to the LEFT operand, so the right-hand
      // value is not necessarily what lands in the binding. Only plain `=`
      // is unwrapped.
      name: 'a logical-assignment chain is not unwrapped',
      code: `let a = null;\nvar pets = a ||= null;\npets.push(1);`,
      errors: 1,
    },
  ],
});
