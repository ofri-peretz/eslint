/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `prefer-default-export` under eslint-plugin-import's `{ target: 'any' }`,
 * with its meaning: every file with a named export needs a default export,
 * unless an `export * from` publishes names this file cannot see. It was
 * rejected, so a config carried over from `import/prefer-default-export`
 * failed to load (16 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferDefaultExport } from '../rules/prefer-default-export';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const any = [{ target: 'any' as const }];

describe('prefer-default-export — eslint-plugin-import options', () => {
  ruleTester.run('prefer-default-export', preferDefaultExport, {
    valid: [
      {
        name: "target 'any': named exports beside a default export",
        code: "export const foo = 'foo';\nexport const bar = 'bar';\nexport default 42;",
        options: any,
      },
      {
        name: "target 'any': a default published as a specifier",
        code: 'export const a = 4;\nlet foo;\nexport { foo as default };',
        options: any,
      },
      {
        name: "target 'any': an export * from silences it",
        code: "export * from './foo';\nexport const a = 1;",
        options: any,
      },
      {
        name: "target 'any': no exports at all",
        code: 'const a = 5;',
        options: any,
      },
    ],
    invalid: [
      {
        name: "target 'any': several named exports and no default",
        code: "export const foo = 'foo';\nexport function bar() {}",
        options: any,
        errors: [{ messageId: 'multipleNamedToDefault' }],
      },
      {
        name: "target 'any': one named export and no default",
        code: "const foo = 'foo';\nexport { foo };",
        options: any,
        errors: [{ messageId: 'multipleNamedToDefault' }],
      },
      {
        name: "target 'any': a destructured export",
        code: "export const { foo: { bar } } = { foo: { bar: 'baz' } };",
        options: any,
        errors: [{ messageId: 'multipleNamedToDefault' }],
      },
    ],
  });
});
