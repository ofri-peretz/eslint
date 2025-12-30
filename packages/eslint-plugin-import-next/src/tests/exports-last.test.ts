/**
 * Tests for exports-last
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { exportsLast } from '../rules/exports-last';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('exports-last', exportsLast, {
  valid: [
    // All code, then exports at end
    {
      code: `
        const a = 1;
        const b = 2;
        export { a, b };
      `,
    },

    // Single export at end
    {
      code: `
        function foo() {}
        export { foo };
      `,
    },

    // Multiple exports at end
    {
      code: `
        const a = 1;
        const b = 2;
        export { a };
        export { b };
      `,
    },

    // Default export at end
    {
      code: `
        const foo = 1;
        export default foo;
      `,
    },

    // Inline exports are allowed (they're bound to their declaration)
    {
      code: `
        export const a = 1;
        const b = 2;
      `,
    },

    // Only exports (no other statements)
    {
      code: `export { foo };`,
    },

    // Re-export at end
    {
      code: `
        const x = 1;
        export * from './module';
      `,
    },
  ],

  invalid: [
    // Export before non-export statement
    {
      code: `
        export { a };
        const a = 1;
      `,
      errors: [{ messageId: 'exportNotLast' }],
    },

    // Export in middle of code
    {
      code: `
        const a = 1;
        export { a };
        const b = 2;
      `,
      errors: [{ messageId: 'exportNotLast' }],
    },

    // Default export before other code
    {
      code: `
        const foo = 1;
        export default foo;
        const bar = 2;
      `,
      errors: [{ messageId: 'exportNotLast' }],
    },

    // Multiple exports, some not at end
    {
      code: `
        export { a };
        const a = 1;
        export { b };
        const b = 2;
      `,
      errors: [
        { messageId: 'exportNotLast' },
        { messageId: 'exportNotLast' },
      ],
    },

    // Re-export not at end
    {
      code: `
        export * from './a';
        const x = 1;
      `,
      errors: [{ messageId: 'exportNotLast' }],
    },
  ],
});
