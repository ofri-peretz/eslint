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
 * 7 such misses were measured across these 2 rules by
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

import { noInnerhtml } from './rules/no-innerhtml';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';

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
  ruleTester.run('no-innerhtml', noInnerhtml, {
    valid: [],
    invalid: [
      {
        // @found spelling probe
        // 2 mutations of this rule's own true positives went
        // silent when its quoted strings became template literals.
        name: 'FN: the same code with template literals instead of quoted strings',
        code: 'el[`innerHTML`] = userInput;',
        errors: [{ messageId: 'dangerousInnerHTML' }],
      },
    ],
  });

  ruleTester.run('no-missing-security-headers', noMissingSecurityHeaders, {
    valid: [],
    invalid: [
      {
        // @found spelling probe
        // 5 mutations of this rule's own true positives went
        // silent when its quoted strings became template literals.
        name: 'FN: the same code with template literals instead of quoted strings',
        code: 'module.exports = { async headers() { return [{ source: `/(.*)`, headers: [{ key: `X-Frame-Options`, value: `DENY` }] }]; } };',
        errors: [{ messageId: 'missingSecurityHeader' }],
      },
    ],
  });
});
