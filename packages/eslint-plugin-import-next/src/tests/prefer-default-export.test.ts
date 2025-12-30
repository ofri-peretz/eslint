import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferDefaultExport } from '../rules/prefer-default-export';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-default-export', preferDefaultExport, {
  valid: [
    // Default options (target: single)
    { code: `export default function bar() {};` },
    { code: `export const foo = 1; export const bar = 2;` },
    { code: `export default 1;` },
    // Type-only exports should be ignored
    { code: `export type Foo = string;` },
    { code: `export interface Bar {}` },
    { code: `export type { Foo } from 'foo';` }, // exportKind: type on declaration
    { code: `export { type Foo } from 'foo';` }, // exportKind: type on specifier (Hit Line 224)
  ],

  invalid: [
    // Single named export should be default
    {
      code: `export const foo = 1;`,
      errors: [{ 
          messageId: 'preferDefaultExport',
          suggestions: [{
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport const foo = 1;`
          }]
      }],
    },
    {
      code: `export function foo() {};`,
      errors: [{ 
          messageId: 'preferDefaultExport',
          suggestions: [{
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport function foo() {};`
          }]
      }],
    },
    {
      code: `export { foo }; var foo = 1;`,
      errors: [{ 
          messageId: 'preferDefaultExport',
          suggestions: [{
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport { foo }; var foo = 1;`
          }]
      }],
    },
    // Target: always
    {
        code: `export const a = 1; export const b = 2;`,
        options: [{ target: 'always' }],
        errors: [{ messageId: 'multipleNamedToDefault' }] // Hit Line 245
    }
  ],
});
