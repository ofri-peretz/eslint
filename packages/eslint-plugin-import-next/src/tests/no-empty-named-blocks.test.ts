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
    {
      name: 'a {} inside a comment is no named block',
      code: `import a /* {} */ from 'foo';`,
    },
    // Non-empty imports
    { name: 'a named import', code: `import { foo } from 'bar';` },
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
    {
      name: 'a comment inside the braces leaves the block empty',
      code: `import { /* nothing yet */ } from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: `import 'foo';`,
    },
    {
      name: 'a default import with a commented empty block',
      code: `import a, { /* nothing yet */ } from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            { messageId: 'suggestRemove', output: `import a from 'foo';` },
          ],
        },
      ],
      output: `import a from 'foo';`,
    },
    // Empty named import only - fixable (removes entire import)
    {
      name: 'an import with an empty named block',
      code: `import {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: `import 'foo';`,
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
      output: `import 'foo';`,
    },

    {
      name: 'the fix keeps import attributes when it keeps the load',
      code: `import {} from './data.json' with { type: 'json' };`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: `import './data.json' with { type: 'json' };`,
    },
    {
      name: 'a type-only empty import loads nothing, so the fix removes it',
      code: `import type {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: ``,
    },
    {
      name: 'a type-only empty re-export loads nothing, so the fix removes it',
      code: `export type {} from 'foo';`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [{ messageId: 'suggestRemove', output: `` }],
        },
      ],
      output: ``,
    },
    {
      // #1552: removing this compiles to nothing, then silently stops
      // `declare module 'some-lib'` from binding as an augmentation under
      // Node16/NodeNext resolution. Still reported — and the suggestion
      // still offers the removal as an explicit choice — but NOT autofixed.
      name: 'a type-only empty import beside a declare module for the same specifier is not autofixed',
      code: `import type {} from 'some-lib';\ndeclare module 'some-lib' { interface Registry { mine: { enabled: boolean } } }`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            {
              messageId: 'suggestRemove',
              output: `\ndeclare module 'some-lib' { interface Registry { mine: { enabled: boolean } } }`,
            },
          ],
        },
      ],
      output: null,
    },
    {
      // FN GUARD: a declare module for a DIFFERENT specifier does not
      // protect this one — the autofix still applies. A sibling `export {}`
      // keeps the file a module independent of this import, so removing it
      // cannot itself change whether `declare module 'some-lib'` augments or
      // declares — the one thing this case means to isolate.
      name: 'a type-only empty import beside a declare module for a different specifier is still autofixed',
      code: `import type {} from 'foo';\nexport {};\ndeclare module 'some-lib' {}`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            {
              messageId: 'suggestRemove',
              output: `\nexport {};\ndeclare module 'some-lib' {}`,
            },
          ],
        },
      ],
      output: `\nexport {};\ndeclare module 'some-lib' {}`,
    },
    {
      // Two empty type-only imports in one file: the declare-module scan
      // must run once and be reused, not redone per import.
      name: 'a second type-only empty import in the same file reuses the declare-module scan',
      code: `import type {} from 'a';\nimport type {} from 'b';\ndeclare module 'b' {}`,
      errors: [
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            {
              messageId: 'suggestRemove',
              output: `\nimport type {} from 'b';\ndeclare module 'b' {}`,
            },
          ],
        },
        {
          messageId: 'emptyNamedBlock',
          suggestions: [
            {
              messageId: 'suggestRemove',
              output: `import type {} from 'a';\n\ndeclare module 'b' {}`,
            },
          ],
        },
      ],
      output: `\nimport type {} from 'b';\ndeclare module 'b' {}`,
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
      output: `import 'foo';`,
    },
  ],
});
