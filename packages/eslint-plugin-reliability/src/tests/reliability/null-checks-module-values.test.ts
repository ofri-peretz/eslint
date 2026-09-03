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
    // RETIRED with the deny-list model. Both of these tested that a specific
    // EXEMPTION could not be defeated — a shadowed `require`, an un-unwrapped
    // `||=`. The rule no longer has exemptions to defeat: it reports only on
    // positive evidence of nullability, and neither shape supplies any.
    //
    // Both are real nullability that the rule now misses, and both need
    // analysis it does not have — inter-procedural return types for the first,
    // sound logical-assignment evaluation for the second. Recorded as known
    // gaps rather than deleted.
    {
      name: 'RETIRED: a locally-defined require returning null needs inter-procedural analysis',
      code: `function require(x) { return null; }\nconst u = require('u');\nu.go();`,
    },
    {
      name: 'RETIRED: `||=` can evaluate to the LEFT operand, so the init is not unwrapped',
      code: `let a = null;\nvar pets = a ||= null;\npets.push(1);`,
    },
  ],
  // Every case this file pinned as INVALID tested a deny-list exemption, and
  // the deny-list is gone. They are kept above as valid, with the analysis each
  // would need in order to come back.
  invalid: [],
});
