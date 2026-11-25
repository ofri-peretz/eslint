/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An ambient declaration describes a binding; it does not create one.
 *
 * NestJS's `kafka.interface.ts` carries `export let Partitioners: {...}` inside
 * a `declare module` block to type a library's export, and a `.d.ts` file is
 * ambient from the first line. The rule's concern is a live, reassignable
 * binding in THIS module's runtime output. Here there is no output at all, and
 * the autofix to `const` would rewrite the library's published type.
 *
 * Real declarations in ordinary source keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMutableExports } from '../rules/no-mutable-exports';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-mutable-exports (ambient)', noMutableExports, {
  valid: [
    {
      name: 'nest kafka.interface.ts: export let inside `declare module`',
      code: 'declare module "kafkajs" {\n  export let Partitioners: { a: number };\n}',
    },
    {
      name: 'export var inside `declare namespace`',
      code: 'declare namespace Lib {\n  export var version: string;\n}',
    },
    {
      name: 'a nested namespace inside a declared module',
      code: 'declare module "x" {\n  namespace Inner {\n    export let n: number;\n  }\n}',
    },
    {
      name: '`export declare let`',
      code: 'export declare let flag: boolean;',
    },
    {
      name: '`declare global` block',
      code: 'export {};\ndeclare global {\n  namespace G {\n    export let n: number;\n  }\n}',
    },
    {
      name: 'a declaration file is ambient throughout',
      code: 'export let counter: number;',
      filename: 'types.d.ts',
    },
    {
      name: 'a declaration file with a `let` exported through a specifier',
      code: 'declare let counter: number;\nexport { counter };',
      filename: 'types.d.mts',
    },
    {
      name: '`declare let` re-exported through a specifier',
      code: 'declare let counter: number;\nexport { counter };',
    },
  ],
  invalid: [
    {
      name: 'a plain export let is still a live binding',
      code: 'export let count = 0;',
      output: 'export const count = 0;',
      errors: [{ messageId: 'noMutableExport' }],
    },
    {
      name: 'an export var in a namespace that is NOT ambient',
      code: 'namespace Lib {\n  export var version = "1";\n}',
      errors: [{ messageId: 'noMutableExport' }],
      output: 'namespace Lib {\n  export const version = "1";\n}',
    },
    {
      name: 'a runtime (non-declare) module block in a .ts file',
      code: 'export let a = 1;\nexport var b = 2;',
      output: 'export const a = 1;\nexport const b = 2;',
      errors: [
        { messageId: 'noMutableExport' },
        { messageId: 'noMutableExport' },
      ],
    },
    {
      name: 'a let exported through a specifier is still live',
      code: 'let count = 0;\nexport { count };',
      errors: [{ messageId: 'noMutableExport' }],
    },
    {
      name: 'a file that merely sounds like a declaration file',
      code: 'export let count = 0;',
      filename: 'types.d.ts.ts',
      output: 'export const count = 0;',
      errors: [{ messageId: 'noMutableExport' }],
    },
  ],
});
