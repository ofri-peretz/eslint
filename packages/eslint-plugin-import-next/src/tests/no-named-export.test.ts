/**
 * Tests for no-named-export (Expanded)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noNamedExport } from '../rules/no-named-export';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-named-export', noNamedExport, {
  valid: [
    {
      name: 'export type * publishes only types',
      code: `export type * from './types';`,
    },
    {
      name: 'a namespace declaration is not a value export this rule checks',
      code: `export namespace NS { export type T = string; }`,
    },
    {
      name: 'allowNames covers every name a destructured export declares',
      code: `const obj = { a: 1, b: 2 }; export const { a, b } = obj;`,
      options: [{ allowNames: ['a', 'b'] }],
    },
    {
      name: 'a binding exported as the string name "default" is the default export',
      code: `const v = 1; export { v as "default" };`,
    },
    {
      name: 'export * as default is the default export',
      code: `export * as default from './m';`,
    },
    {
      name: 'allowInFiles: a ** glob matches an absolute filename',
      code: `export const foo = 1;`,
      filename: '/repo/packages/web/src/utils.test.ts',
      options: [{ allowInFiles: ['src/*.test.ts'] }],
    },
    { name: 'a default export', code: `export default 42;` },
    { code: `const x = 1;` },
    { code: `export type Foo = string;` },
    { code: `export interface Bar {}` },
    // Re-export default as default (implicitly valid usually, but specifically named export of default)
    { code: `export { default } from 'foo';` }, 
    
    // allowNames option
    {
      code: `export const allowed = 1;`,
      options: [{ allowNames: ['allowed'] }]
    },
    {
      code: `export function allowedFn() {}`,
      options: [{ allowNames: ['allowedFn'] }]
    },
    
    // allowPatterns - Exact Match (Relative)
    {
        code: `export const foo = 1;`,
        filename: 'src/utils.test.ts', 
        options: [{ allowInFiles: ['src/utils.test.ts'] }]
    },
     // allowPatterns - Simple Glob (Root file)
    {
        code: `export const foo = 1;`,
        filename: 'utils.test.ts',
        options: [{ allowInFiles: ['*.test.ts'] }]
    },
    // allowPatterns - Recursive Glob
    {
        code: `export const foo = 1;`,
        filename: 'src/utils.test.ts',
        options: [{ allowInFiles: ['src/*.test.ts'] }]
    },
    // allowPatterns - Double Star
    {
        code: `export const foo = 1;`,
        filename: 'src/utils.test.ts',
        options: [{ allowInFiles: ['**/*.test.ts'] }]
    },
    // Specifiers Allowed
    {
        code: `const foo = 1; export { foo };`,
        options: [{ allowNames: ['foo'] }]
    }
  ],

  invalid: [
    {
      name: 'array, default and rest bindings each publish a name',
      code: `const arr = [1, 2, 3]; export const [a, b = 1, ...rest] = arr;`,
      options: [{ allowNames: ['a', 'b'] }],
      errors: [{ messageId: 'namedExport' }],
    },
    {
      name: 'an exported enum is a named value export',
      code: `export enum Color { Red }`,
      errors: [{ messageId: 'namedExport' }],
    },
    {
      name: 'a string-named export is a named export',
      code: `const v = 1; export { v as "a" };`,
      errors: [{ messageId: 'namedExport' }],
    },
    {
      name: 'export * from re-exports every named export of the module',
      code: `export * from './m';`,
      errors: [{ messageId: 'namedExport' }],
    },
    {
      name: 'export * as ns from publishes the name ns',
      code: `export * as ns from './m';`,
      errors: [{ messageId: 'namedExport' }],
    },
    {
      name: 'allowNames does not cover export * from (its names are unknown)',
      code: `export * from './m';`,
      options: [{ allowNames: ['a'] }],
      errors: [{ messageId: 'namedExport' }],
    },
    // Variable Declaration
    {
      name: 'a named export',
      code: `export const foo = 1;`,
      errors: [{ messageId: 'namedExport' }]
    },
    {
        code: `export const foo = 1;`,
        filename: 'src/utils.ts',
        options: [{ allowInFiles: ['**/*.test.ts'] }],
        errors: [{ messageId: 'namedExport' }]
    },
    // Function Declaration
    {
        code: `export function bar() {}`,
        errors: [{ messageId: 'namedExport' }]
    },
    // Class Declaration
    {
        code: `export class Baz {}`,
        errors: [{ messageId: 'namedExport' }]
    },
    // Export Specifiers
    {
        code: `const foo = 1; export { foo };`, // Hit specifier loop
        errors: [{ messageId: 'namedExport' }]
    },
    {
        code: `const foo = 1; export { foo as bar };`, // Hit specifier loop with alias
        errors: [{ messageId: 'namedExport' }]
    },
    // Re-exports
    {
        code: `export { foo } from 'bar';`, 
        errors: [{ messageId: 'namedExport' }]
    }
  ],
});
