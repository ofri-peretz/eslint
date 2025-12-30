/**
 * Tests for no-empty-named-blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEmptyNamedBlocks } from '../rules/no-empty-named-blocks';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-empty-named-blocks', noEmptyNamedBlocks, {
  valid: [
    // Non-empty imports
    { code: `import { foo } from 'bar';` },
    { code: `import { foo, bar } from 'baz';` },
    { code: `import foo from 'bar';` },
    { code: `import * as foo from 'bar';` },
    { code: `import foo, { bar } from 'baz';` },

    // Default import with named import
    { code: `import Default, { named } from 'module';` },

    // Side-effect import
    { code: `import 'side-effect';` },

    // Non-empty exports
    { code: `export { foo };` },
    { code: `export { foo, bar };` },
    { code: `export { foo } from 'bar';` },

    // Export declarations
    { code: `export const foo = 1;` },
    { code: `export function bar() {}` },
  ],

  invalid: [
    // Empty named import only - fixable (removes entire import)
    {
      code: `import {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: ``,
    },

    // Default import with empty braces - fixable (removes empty braces)
    {
      code: `import Default, {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            { messageId: 'suggestRemove', output: `import Default from 'foo';` },
          ],
        },
      ],
      output: `import Default from 'foo';`,
    },

    // Empty re-export - fixable (removes entire export)
    {
      code: `export {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: ``,
    },

    // Empty braces with whitespace
    {
      code: `import {   } from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: ``,
    },
  ],
});
