/**
 * Tests for no-mutable-exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMutableExports } from '../rules/no-mutable-exports';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-mutable-exports', noMutableExports, {
  valid: [
    // const exports are allowed
    { code: `export const foo = 1;` },
    { code: `export const bar = { a: 1 };` },
    { code: `export const baz = [1, 2, 3];` },

    // Function exports are allowed
    { code: `export function foo() {}` },
    { code: `export const fn = () => {};` },

    // Class exports are allowed
    { code: `export class Foo {}` },

    // Default exports are allowed
    { code: `export default 42;` },
    { code: `export default function() {}` },

    // Re-exports are allowed
    { code: `export { foo } from './foo';` },

    // Type exports are allowed
    { code: `export type Foo = string;` },

    // Non-exported let/var
    { code: `let x = 1; const y = 2; export { y };` },
  ],

  invalid: [
    // Export let
    {
      code: `export let foo = 1;`,
      errors: [{ messageId: 'letExport' }],
    },

    // Export var
    {
      code: `export var bar = 2;`,
      errors: [{ messageId: 'varExport' }],
    },

    // Multiple mutable exports
    {
      code: `export let a = 1; export var b = 2;`,
      errors: [
        { messageId: 'letExport' },
        { messageId: 'varExport' },
      ],
    },

    // Let with destructuring
    {
      code: `export let { a, b } = obj;`,
      errors: [
        { messageId: 'letExport' },
        { messageId: 'letExport' },
      ],
    },

    // Var with multiple declarators
    {
      code: `export var x = 1, y = 2;`,
      errors: [
        { messageId: 'varExport' },
        { messageId: 'varExport' },
      ],
    },
  ],
});
