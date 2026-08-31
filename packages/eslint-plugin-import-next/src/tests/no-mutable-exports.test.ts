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
    { name: 'a const export', code: `export const foo = 1;` },
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

    // FP: the old implementation grepped the file text for
    // `export\\s*{\\s*<name>\\s*}`, so the characters appearing ANYWHERE
    // reported — including places that are not an export at all.
    {
      name: 'a name this file never declares',
      code: `export { nope };`,
    },
    {
      name: 'an imported binding re-exported unchanged',
      code: `import { x } from './a';\nexport { x };\n`,
    },
    {
      // @found implementation review
      name: 'FP: the export is in a comment',
      code: `let x = 1;\n// export { x }\n`,
    },
    {
      // @found implementation review
      name: 'FP: the export is inside a string',
      code: `const doc = "export { x }";\nlet x = 1;\n`,
    },
    {
      // @found implementation review
      name: 'FP: a re-export of another module\u2019s binding of the same name',
      code: `export { x } from './other';\nfunction f() { let x = 1; return x; }\n`,
    },
    {
      // @found implementation review
      name: 'FP: a function-scoped let colliding with an exported const',
      code: `const x = 1;\nexport { x };\nfunction f() { let x = 2; return x; }\n`,
    },
  ],

  invalid: [
    // FN: the old text-grep only matched a lone specifier in braces, so a
    // list and a rename both read as "not exported" and went unreported.
    {
      // @found implementation review
      name: 'FN: a mutable binding in a multi-specifier export list',
      code: `let a = 1; let b = 2; export { a, b };`,
      errors: [{ messageId: 'letExport' }, { messageId: 'letExport' }],
    },
    {
      // ES2022 arbitrary module namespace names. `ignoreExports` matches the
      // published name, so the published name has to be readable when it is
      // a string rather than an identifier.
      // @found implementation review
      name: 'FN: a mutable binding exported under a string name',
      code: `let x = 1; export { x as "the-x" };`,
      errors: [{ messageId: 'letExport' }],
    },
    {
      // @found implementation review
      name: 'FN: a mutable binding exported under another name',
      code: `let x = 1; export { x as y };`,
      errors: [{ messageId: 'letExport' }],
    },
    {
      // @found implementation review
      name: 'FN: a mutable binding exported with var',
      code: `var x = 1; export { x };`,
      errors: [{ messageId: 'varExport' }],
    },

    // Export let
    {
      name: 'a let export the importer sees change under them',
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
