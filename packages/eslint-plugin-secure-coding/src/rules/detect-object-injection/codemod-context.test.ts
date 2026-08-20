/**
 * A codemod indexes an AST by a computed key on every line. That is what a
 * codemod IS, and none of it is user-input indexing — so the rule suppresses in
 * that context.
 *
 * ## Why this file exists
 *
 * The two loop visitors guarded their entry with `isInCodemodContext ||
 * isTestFile`. When `isTestFile` moved out of the rule and became
 * `skipTestFiles` at the `createRule` boundary, coverage fell — and the fall was
 * informative: those branches had only ever been reached through the *test-file*
 * half of the condition. Nothing had ever exercised the codemod suppression on a
 * `for…of` mass-assignment loop or a `for…in` copy loop.
 *
 * That is the "tests that pass on the broken code" shape from the other
 * direction: a branch that looks covered because a neighbouring condition
 * short-circuits it. Each case below therefore carries its own CONTROL — the
 * identical loop in an ordinary source file, which must still report. Without
 * the control, a rule that suppressed everywhere would pass this file.
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

const MASS_ASSIGNMENT = `export function apply(req, user) {
  for (const k of Object.keys(req.body)) {
    user[k] = req.body[k];
  }
}`;

// The `merge(target, source)` shape — the one behind every real npm
// prototype-pollution CVE, and the one `checkPrototypePollutingCopyLoop` was
// written for.
const PROTOTYPE_COPY = `export function merge(target, source) {
  for (const k in source) {
    target[k] = source[k];
  }
}`;

describe('detect-object-injection — codemod context', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'mass-assignment loop in a file named codemod.ts',
        filename: 'scripts/codemod.ts',
        code: MASS_ASSIGNMENT,
      },
      {
        name: 'mass-assignment loop under a codemods/ directory',
        filename: 'tools/codemods/rename-props.ts',
        code: MASS_ASSIGNMENT,
      },
      {
        name: 'prototype-copy loop in a file named codemod.ts',
        filename: 'scripts/codemod.ts',
        code: PROTOTYPE_COPY,
      },
      {
        name: 'prototype-copy loop under a codemods/ directory',
        filename: 'tools/codemods/rename-props.ts',
        code: PROTOTYPE_COPY,
      },
    ],
    invalid: [
      {
        // CONTROL. Byte-identical to the first valid case; only the path differs.
        // If this stops reporting, the suppression has escaped the codemod
        // context and every valid case above is passing vacuously.
        name: 'CONTROL: the same mass-assignment loop in ordinary source',
        filename: 'src/users.ts',
        code: MASS_ASSIGNMENT,
        errors: 1,
      },
      {
        name: 'CONTROL: the same prototype-copy loop in ordinary source',
        filename: 'src/users.ts',
        code: PROTOTYPE_COPY,
        errors: 1,
      },
    ],
  });
});
