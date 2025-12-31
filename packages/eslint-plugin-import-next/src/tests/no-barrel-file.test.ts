/**
 * Tests for no-barrel-file
 * Detects barrel files that harm build performance and tree-shaking
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBarrelFile } from '../rules/no-barrel-file';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-barrel-file', noBarrelFile, {
  valid: [
    // ✅ Single re-export (public API pattern) - common and acceptable
    {
      code: `export { MyComponent } from './MyComponent';`,
      filename: '/project/src/components/Button/index.ts',
    },

    // ✅ Two re-exports (below default threshold of 3)
    {
      code: `
        export { Button } from './Button';
        export { Input } from './Input';
      `,
      filename: '/project/src/components/index.ts',
    },

    // ✅ File with local exports and re-exports - allowed when configured
    {
      code: `
        export * from './types';
        export * from './utils';
        export * from './constants';
        export const VERSION = '1.0.0';
        export function init() { return true; }
      `,
      filename: '/project/src/lib/index.ts',
      options: [{ allowWithLocalExports: true }],
    },

    // ✅ Not an index file (doesn't match barrel patterns)
    {
      code: `
        export * from './a';
        export * from './b';
        export * from './c';
        export * from './d';
      `,
      filename: '/project/src/utils/helpers.ts',
    },

    // ✅ Allowed path via configuration
    {
      code: `
        export * from './Button';
        export * from './Modal';
        export * from './Table';
        export * from './Input';
      `,
      filename: '/project/src/public-api.ts',
      options: [
        {
          allowedPaths: ['public-api\\.ts$'],
          barrelPatterns: ['public-api\\.ts$', 'index\\.(ts|tsx|js|jsx)$'],
        },
      ],
    },

    // ✅ Package entry point (common exception)
    {
      code: `
        export * from './core';
        export * from './plugins';
        export * from './types';
      `,
      filename: '/project/packages/my-lib/src/index.ts',
      options: [
        {
          allowedPaths: ['packages/.*/src/index\\.ts$'],
        },
      ],
    },

    // ✅ Higher threshold configuration
    {
      code: `
        export * from './a';
        export * from './b';
        export * from './c';
        export * from './d';
      `,
      filename: '/project/src/utils/index.ts',
      options: [{ threshold: 5 }],
    },

    // ✅ Default export only (not a barrel)
    {
      code: `
        const config = { theme: 'dark' };
        export default config;
      `,
      filename: '/project/src/config/index.ts',
    },

    // ✅ Only named local exports (not a barrel)
    {
      code: `
        export const FOO = 'foo';
        export const BAR = 'bar';
        export function baz() { return 'baz'; }
      `,
      filename: '/project/src/constants/index.ts',
    },

    // ✅ Type-only re-exports (2, below threshold)
    {
      code: `
        export type { User } from './User';
        export type { Post } from './Post';
      `,
      filename: '/project/src/types/index.ts',
    },

    // ✅ Empty file
    {
      code: ``,
      filename: '/project/src/empty/index.ts',
    },

    // ✅ Comments only
    {
      code: `
        // This file intentionally left blank
      `,
      filename: '/project/src/future/index.ts',
    },

    // ✅ Non-matching file pattern (utils.js instead of index.js)
    {
      code: `
        export * from './moduleA';
        export * from './moduleB';
        export * from './moduleC';
      `,
      filename: '/project/src/utils.js',
    },
  ],

  invalid: [
    // ❌ Classic barrel file: 3+ re-exports from different modules
    {
      code: `
        export * from './Button';
        export * from './Modal';
        export * from './Table';
      `,
      filename: '/project/src/components/index.ts',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ Named re-exports barrel
    {
      code: `
        export { Button } from './Button';
        export { Modal } from './Modal';
        export { Table } from './Table';
      `,
      filename: '/project/src/components/index.ts',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ Mixed re-export styles
    {
      code: `
        export * from './Button';
        export { Modal } from './Modal';
        export { Table, TableRow, TableCell } from './Table';
      `,
      filename: '/project/src/components/index.ts',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ Large barrel file (common in component libraries)
    {
      code: `
        export * from './Button';
        export * from './Modal';
        export * from './Table';
        export * from './Input';
        export * from './Select';
        export * from './Checkbox';
        export * from './Radio';
        export * from './Textarea';
        export * from './Form';
        export * from './Card';
      `,
      filename: '/project/src/components/index.ts',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ JavaScript barrel file
    {
      code: `
        export * from './moduleA';
        export * from './moduleB';
        export * from './moduleC';
      `,
      filename: '/project/src/utils/index.js',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ TypeScript JSX barrel file
    {
      code: `
        export * from './Button';
        export * from './Icon';
        export * from './Link';
      `,
      filename: '/project/src/components/index.tsx',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ Mixed barrel with high re-export ratio triggers suggestion
    {
      code: `
        export * from './a';
        export * from './b';
        export * from './c';
        export const VERSION = '1.0.0';
      `,
      filename: '/project/src/lib/index.ts',
      options: [{ allowWithLocalExports: false, reexportRatio: 0.7 }],
      errors: [{ messageId: 'considerDirectExports' }],
    },

    // ❌ Custom threshold (threshold: 2)
    {
      code: `
        export * from './a';
        export * from './b';
      `,
      filename: '/project/src/utils/index.ts',
      options: [{ threshold: 2 }],
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ Nested barrel file
    {
      code: `
        export * from './sub1';
        export * from './sub2';
        export * from './sub3';
      `,
      filename: '/project/src/features/auth/components/index.ts',
      errors: [{ messageId: 'barrelFileDetected' }],
    },

    // ❌ High re-export ratio triggers suggestion (mixed barrel)
    {
      code: `
        export * from './a';
        export * from './b';
        export * from './c';
        export const LOCAL = 'value';
      `,
      filename: '/project/src/mixed/index.ts',
      options: [{ reexportRatio: 0.5 }],
      errors: [{ messageId: 'considerDirectExports' }],
    },
  ],
});
