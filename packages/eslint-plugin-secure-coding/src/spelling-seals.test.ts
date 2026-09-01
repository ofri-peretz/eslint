/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Sealed misses: code these rules reported in one spelling and missed in another.
 *
 * A no-substitution template literal IS a string constant. Prettier leaves them,
 * codegen emits them, `String.raw` requires them — and every rule below matched
 * `node.type === 'Literal'` by hand, so every rule below was silent on half of
 * its own subject.
 *
 * 23 such misses were measured across these 2 rules by
 * `scripts/spelling-probe.mts`, which rewrites a known true positive into a form
 * the grammar treats as identical and checks whether the rule still sees it.
 * The fix was one call — `staticString` from the devkit — not one patch per rule.
 *
 * Each case below fails on the rule as it was and passes on the rule as it is.
 * One case per rule, not one per mutation: the mistake was a class, and 1,156
 * near-identical rows would bury the eight considered gaps we actually have.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noInsecureComparison } from './rules/no-insecure-comparison';
import { noSensitiveDataExposure } from './rules/no-sensitive-data-exposure';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

suite('spellings these rules used to miss', () => {
  ruleTester.run('no-insecure-comparison', noInsecureComparison, {
    valid: [],
    invalid: [
      {
        // @found spelling probe
        // 1 mutation of this rule's own true positives went
        // silent when its quoted strings became template literals.
        name: 'FN: the same code with template literals instead of quoted strings',
        code: 'if (req.headers[`x-api-key`] === config[`apiKey`]) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            // RuleTester requires a seal to assert the suggestion rather
            // than ignore it, so the offer is pinned here too.
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output:
                  'if (crypto.timingSafeEqual(Buffer.from(req.headers[`x-api-key`]), Buffer.from(config[`apiKey`]))) {}',
              },
            ],
          },
        ],
      },
    ],
  });

  ruleTester.run('no-sensitive-data-exposure', noSensitiveDataExposure, {
    valid: [],
    invalid: [
      {
        // @found spelling probe
        // 22 mutations of this rule's own true positives went
        // silent when its quoted strings became template literals.
        name: 'FN: the same code with template literals instead of quoted strings',
        code: 'console.log(`password: 123456`);',
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });
});
