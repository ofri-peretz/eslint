/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `testFilePattern` is three-state, and `null` is the state that means "decide
 * structurally".
 *
 * The option was introduced with no schema default because no STRING expresses
 * that: `''` compiles to a regex matching every path, which would exempt the
 * whole codebase. `option-without-default` fired on exactly that, and it was
 * right — a default living only in the destructuring is one the docs cannot
 * state and a consumer cannot read.
 *
 * Naming `null` gives the third state a value. These cases prove the value is
 * real behaviour and not schema decoration.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPrivilegeEscalation } from './index';

const ruleTester = new RuleTester();

const ESCALATION = `export function h(req, user) { user.role = req.body.role; return user; }`;

ruleTester.run('no-privilege-escalation — testFilePattern', noPrivilegeEscalation, {
  valid: [
    {
      // The structural predicate decides, and it says this is a test file.
      name: 'allowInTests with the option unset exempts a .test.ts file',
      code: ESCALATION,
      filename: 'src/user.test.ts',
      options: [{ allowInTests: true }],
    },
    {
      // Explicit null must behave exactly as unset — that is what makes it a
      // usable default rather than a value with its own meaning.
      name: 'an explicit null behaves the same as unset',
      code: ESCALATION,
      filename: 'src/user.test.ts',
      options: [{ allowInTests: true, testFilePattern: null }],
    },
    {
      // A user override takes over completely, including for paths the
      // structural predicate would not call tests.
      name: 'a user pattern exempts a path the predicate would not',
      code: ESCALATION,
      filename: 'src/fixtures/seed-data.ts',
      options: [{ allowInTests: true, testFilePattern: 'fixtures/' }],
    },
  ],
  invalid: [
    {
      // CONTROL: without allowInTests the filename is irrelevant.
      name: 'CONTROL: a test file still reports when allowInTests is off',
      code: ESCALATION,
      filename: 'src/user.test.ts',
      options: [{ allowInTests: false }],
      errors: 1,
    },
    {
      // CONTROL: a user pattern REPLACES the predicate rather than adding to
      // it, so a real test file stops being exempt once the override is set.
      name: 'CONTROL: a user pattern replaces the structural predicate',
      code: ESCALATION,
      filename: 'src/user.test.ts',
      options: [{ allowInTests: true, testFilePattern: 'fixtures/' }],
      errors: 1,
    },
    {
      // CONTROL: production code is never exempt.
      name: 'CONTROL: a production path reports',
      code: ESCALATION,
      filename: 'src/user.ts',
      options: [{ allowInTests: true }],
      errors: 1,
    },
  ],
});
