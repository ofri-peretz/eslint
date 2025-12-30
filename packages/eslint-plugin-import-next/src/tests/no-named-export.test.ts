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
    { code: `export default 42;` },
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
    // Variable Declaration
    {
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
