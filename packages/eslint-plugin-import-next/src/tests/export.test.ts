/**
 * Tests for export rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { exportRule } from '../rules/export';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('export', exportRule, {
  valid: [
    // Single named exports
    { code: `export const foo = 1;` },
    { code: `export function bar() {}` },
    { code: `export class Baz {}` },

    // Multiple distinct exports
    {
      code: `
        export const a = 1;
        export const b = 2;
        export const c = 3;
      `,
    },

    // Single default export
    { code: `export default function() {}` },
    { code: `export default class {}` },
    { code: `export default 42;` },

    // Export specifiers with different names
    {
      code: `
        const foo = 1;
        const bar = 2;
        export { foo, bar };
      `,
    },

    // Re-export all
    { code: `export * from './module';` },

    // Named re-export
    { code: `export * as utils from './utils';` },

    // TypeScript exports
    { code: `export type Foo = string;` },
    { code: `export interface Bar { x: number; }` },
    { code: `export enum Status { Active, Inactive }` },
  ],

  invalid: [
    // Duplicate named exports
    {
      code: `
        export const foo = 1;
        export const foo = 2;
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate via export specifier
    {
      code: `
        export const foo = 1;
        const bar = 2;
        export { bar as foo };
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Multiple default exports
    {
      code: `
        export default 1;
        export default 2;
      `,
      errors: [{ messageId: 'duplicateDefault' }],
    },

    // Default via specifier
    {
      code: `
        export default 1;
        const foo = 2;
        export { foo as default };
      `,
      errors: [{ messageId: 'duplicateDefault' }],
    },

    // Duplicate function exports
    {
      code: `
        export function foo() {}
        export function foo() {}
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate class exports
    {
      code: `
        export class Foo {}
        export class Foo {}
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate namespace re-export
    {
      code: `
        export * as utils from './utils';
        export * as utils from './other-utils';
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },
  ],
});
