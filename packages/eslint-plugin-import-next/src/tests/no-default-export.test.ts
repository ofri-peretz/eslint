/**
 * Tests for no-default-export
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDefaultExport } from '../rules/no-default-export';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-default-export', noDefaultExport, {
  valid: [
    // Named exports only
    { code: `export const foo = 1;` },
    { code: `export function bar() {}` },
    { code: `export class Baz {}` },
    { code: `export { foo, bar };` },

    // Re-exports
    { code: `export { foo } from './foo';` },
    { code: `export * from './module';` },
    { code: `export * as utils from './utils';` },

    // No exports at all
    { code: `const x = 1;` },

    // Type exports (TypeScript)
    { code: `export type Foo = string;` },
    { code: `export interface Bar {}` },
  ],

  invalid: [
    // Default export expression (Literal)
    {
      code: `export default 42;`,
      errors: [{ messageId: 'defaultExport' }],
      output: `const defaultExport = 42;\nexport { defaultExport };`,
    },

    // Default export function with name
    {
      code: `export default function foo() {}`,
      errors: [{ messageId: 'defaultExport' }],
      output: `export function foo() {}`,
    },

    // Default export class with name
    {
      code: `export default class Foo {}`,
      errors: [{ messageId: 'defaultExport' }],
      output: `export class Foo {}`,
    },

    // Default export Identifier
    {
      code: `const x = 1; export default x;`,
      errors: [{ messageId: 'defaultExport' }],
      output: `const x = 1; export { x };`,
    },

    // Default export Object
    {
      code: `export default { foo: 1 };`,
      errors: [{ messageId: 'defaultExport' }],
      // New fix behavior correct handling
      output: `const defaultExport = { foo: 1 };\nexport { defaultExport };`,
    },
    
    // Default export arrow function (Anonymous)
    {
        code: `export default () => {};`,
        errors: [{ messageId: 'defaultExport' }],
        output: `const defaultExport = () => {};\nexport { defaultExport };`,
    },

    // Re-export default
    {
        code: `export { default } from 'module';`,
        errors: [{ messageId: 'preferNamedExport' }],
        // No auto-fix for this currently
    },

    // TypeScript export default interface
    {
        code: `export default interface Foo {}`,
        errors: [{ messageId: 'defaultExport' }],
        output: `export interface Foo {}`
    }
  ],
});
