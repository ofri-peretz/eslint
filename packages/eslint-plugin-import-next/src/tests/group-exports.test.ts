/**
 * Tests for group-exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { groupExports } from '../rules/group-exports';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('group-exports', groupExports, {
  valid: [
    // Single export statement
    { code: `export { a, b, c };` },

    // Single export with declaration
    { code: `export const a = 1;` },

    // Single re-export from source
    { code: `export { a, b, c } from './module';` },

    // Different sources (allowed)
    {
      code: `
        export { a } from './a';
        export { b } from './b';
      `,
    },

    // Inline exports (declarations) can be scattered
    {
      code: `
        export const a = 1;
        export const b = 2;
        export const c = 3;
      `,
    },

    // Export default is separate
    {
      code: `
        export { a, b };
        export default c;
      `,
    },
  ],

  invalid: [
    // Multiple local exports
    {
      code: `
        export { a };
        export { b };
      `,
      errors: [{ messageId: 'groupExports' }],
    },

    // Three local exports
    {
      code: `
        export { a };
        export { b };
        export { c };
      `,
      errors: [
        { messageId: 'groupExports' },
        { messageId: 'groupExports' },
      ],
    },

    // Multiple re-exports from same source
    {
      code: `
        export { a } from './module';
        export { b } from './module';
      `,
      errors: [{ messageId: 'groupExports' }],
    },

    // Multiple re-exports from same source
    {
      code: `
        export { a } from './module';
        export { b } from './module';
        export { c } from './module';
      `,
      errors: [
        { messageId: 'groupExports' },
        { messageId: 'groupExports' },
      ],
    },
  ],
});
