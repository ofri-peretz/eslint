/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-anonymous-default-export` under eslint-plugin-import's options, with
 * its meaning.
 *
 * `allowArray`, `allowAnonymousClass`, `allowAnonymousFunction`,
 * `allowCallExpression`, `allowNew`, `allowLiteral` and `allowObject` were
 * rejected, so a config carried over from `import/no-anonymous-default-export`
 * failed to load (13 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). A config that
 * names one of them is read eslint-plugin-import's way: arrays, literals,
 * objects and `new` expressions are reported unless allowed, calls are
 * allowed unless forbidden. Since the spec change that followed mulmoclaude,
 * that is also the reading with no options at all.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAnonymousDefaultExport } from '../rules/no-anonymous-default-export';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const error = [{ messageId: 'anonymousDefaultExport' as const }];

describe('no-anonymous-default-export — eslint-plugin-import options', () => {
  ruleTester.run('no-anonymous-default-export', noAnonymousDefaultExport, {
    valid: [
      {
        name: 'allowArray',
        code: 'export default [];',
        options: [{ allowArray: true }],
      },
      {
        name: 'allowAnonymousClass',
        code: 'export default class {}',
        options: [{ allowAnonymousClass: true }],
      },
      {
        name: 'allowAnonymousFunction',
        code: 'export default function () {}',
        options: [{ allowAnonymousFunction: true }],
      },
      {
        name: 'upstream reading keeps this rule’s own allowClassExpression',
        code: 'export default class {}',
        options: [{ allowLiteral: true, allowClassExpression: true }],
      },
      {
        name: 'allowLiteral: a number',
        code: 'export default 123;',
        options: [{ allowLiteral: true }],
      },
      {
        name: 'allowLiteral: a template literal',
        code: 'export default `foo`;',
        options: [{ allowLiteral: true }],
      },
      {
        name: 'allowObject',
        code: 'export default {};',
        options: [{ allowObject: true }],
      },
      {
        name: 'allowCallExpression: true, its default',
        code: 'export default foo(bar);',
        options: [{ allowCallExpression: true }],
      },
      {
        name: 'upstream reading: a call is allowed by default',
        code: 'export default foo(bar);',
        options: [{ allowObject: true }],
      },
      {
        name: 'allowNew',
        code: 'export default new Foo();',
        options: [{ allowNew: true }],
      },
      {
        name: 'upstream reading: a reference is never reported',
        code: 'const foo = 1;\nexport default foo;',
        options: [{ allowObject: true }],
      },
    ],
    invalid: [
      {
        name: 'defaults: an array (import-js tests line 48)',
        code: 'export default [];',
        errors: error,
      },
      {
        name: 'defaults: a new expression (import-js tests line 57)',
        code: 'export default new Foo();',
        errors: error,
      },
      {
        name: 'upstream reading: a literal when only objects are allowed',
        code: 'export default 123;',
        options: [{ allowObject: true }],
        errors: error,
      },
      {
        name: 'upstream reading: an array',
        code: 'export default [];',
        options: [{ allowLiteral: true }],
        errors: error,
      },
      {
        name: 'upstream reading: an object',
        code: 'export default {};',
        options: [{ allowLiteral: true }],
        errors: error,
      },
      {
        name: 'upstream reading: a new expression',
        code: 'export default new Foo();',
        options: [{ allowLiteral: true }],
        errors: error,
      },
      {
        name: 'allowCallExpression: false',
        code: 'export default foo(bar);',
        options: [{ allowCallExpression: false }],
        errors: error,
      },
      {
        name: 'upstream reading: an anonymous class',
        code: 'export default class {}',
        options: [{ allowLiteral: true }],
        errors: error,
      },
      {
        name: 'upstream reading: an anonymous function',
        code: 'export default function () {}',
        options: [{ allowAnonymousClass: true }],
        errors: error,
      },
    ],
  });
});
