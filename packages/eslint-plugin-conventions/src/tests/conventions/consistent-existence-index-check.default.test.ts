/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The default is `Object.hasOwn`, and which form is the default is the whole point.
 *
 * It used to be `in` — the one form of the three that answers `true` for an
 * INHERITED key. A default is what a codebase gets for having no opinion, and this
 * one pointed every such codebase at the direction a prototype-pollution guard is
 * written to avoid. `Object.hasOwn` exists because `in` and the `hasOwnProperty`
 * dances were both the wrong answer often enough for the language to add a third;
 * eslint core's `prefer-object-has-own` points the same way.
 *
 * `in` is still available and still correct where a chain lookup is what the code
 * MEANS. It is now a choice someone makes rather than one they inherit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentExistenceIndexCheck } from '../../rules/conventions/consistent-existence-index-check';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('consistent-existence-index-check — the default is Object.hasOwn', () => {
  ruleTester.run('with no options at all', consistentExistenceIndexCheck, {
    valid: [
      {
        name: 'Object.hasOwn is what the default asks for, so it is left alone',
        code: 'if (Object.hasOwn(obj, key)) {}',
      },
    ],
    invalid: [
      {
        name: '`in` is reported by default — it answers for inherited keys too',
        code: 'if (key in obj) {}',
        // Not rewritten: the two ask different questions. Only the report is made.
        output: null,
        errors: [{ messageId: 'consistentExistenceCheck' as const }],
      },
      {
        name: 'the long-hand own-property check is shortened, which is safe',
        code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
        output: 'if (Object.hasOwn(obj, key)) {}',
        errors: [{ messageId: 'consistentExistenceCheck' as const }],
      },
      {
        name: 'the direct dispatch is reported but never rewritten',
        code: 'if (obj.hasOwnProperty(key)) {}',
        output: null,
        errors: [{ messageId: 'consistentExistenceCheck' as const }],
      },
    ],
  });
});
