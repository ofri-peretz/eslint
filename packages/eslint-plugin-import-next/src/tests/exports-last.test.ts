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
      name: 'exports at the bottom',
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

    // burgee packages/flagstaff/src/ora.ts:691 — the file's last two statements are
    // `export default function ora(...)` followed by `export async function oraPromise(...)`,
    // with nothing after them, and line 691 was told to "Move this export to the end of the
    // file". A declaration-export was being reclassified into nonExportIndices to exempt it
    // from being reported, which also made it a positional wall for every export before it.
    //
    // Upstream eslint-plugin-import — linked from this rule's documentationLink and @see —
    // treats a declaration-export as an export unconditionally and reports nothing here;
    // its docs list this shape under "This will not be reported".
    {
      name: 'a declaration-export is not a wall for the exports before it',
      code: `
        export default function a() {}
        export function b() {}
      `,
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
      name: 'an export before the declarations it names',
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
      errors: [{ messageId: 'exportNotLast' }, { messageId: 'exportNotLast' }],
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
