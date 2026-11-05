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
    {
      name: 'export * as default is a default export',
      code: `export * as default from './m';`,
    },
    {
      name: 'export type * publishes no value',
      code: `export type * from './types';`,
    },
    {
      name: 'export * from publishes names the file cannot count',
      code: `export const a = 1; export * from './m';`,
    },
    {
      name: 'a re-exported name counts toward the module\'s exports',
      code: `export const a = 1; export { b } from './m';`,
    },
    {
      name: 'export { x as default } is a default export',
      code: `const d = 1; export { d as default };`,
    },
    {
      name: 'ignoreFiles: a glob matches an absolute filename',
      code: `export const a = 1;`,
      filename: '/repo/src/generated/api.ts',
      options: [{ ignoreFiles: ['**/generated/*.ts'] }],
    },
    // Default options (target: single)
    { name: 'a default export', code: `export default function bar() {};` },
    { code: `export const foo = 1; export const bar = 2;` },
    { code: `export default 1;` },
    // Type-only exports should be ignored
    { code: `export type Foo = string;` },
    { code: `export interface Bar {}` },
    { code: `export type { Foo } from 'foo';` }, // exportKind: type on declaration
    { code: `export { type Foo } from 'foo';` }, // exportKind: type on specifier (Hit Line 224)
  ],

  invalid: [
    {
      name: 'export * as ns publishes one name',
      code: `export * as ns from './m';`,
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport * as ns from './m';`,
            },
          ],
        },
      ],
    },
    {
      name: 'as-needed behaves as single: one exported name',
      code: `export const a = 1;`,
      options: [{ target: 'as-needed' }],
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport const a = 1;`,
            },
          ],
        },
      ],
    },
    {
      name: 'an exported enum is the module\'s one export',
      code: `export enum Color { Red }`,
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport enum Color { Red }`,
            },
          ],
        },
      ],
    },
    {
      name: 'always: a re-exported name with no default',
      code: `export { b } from './m';`,
      options: [{ target: 'always' }],
      errors: [{ messageId: 'multipleNamedToDefault' }],
    },
    // Single named export should be default
    {
      name: 'a single named export where a default is the configured style',
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
