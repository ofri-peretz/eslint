/**
 * Tests for dynamic-import-chunkname
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { dynamicImportChunkname } from '../rules/dynamic-import-chunkname';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('dynamic-import-chunkname', dynamicImportChunkname, {
  valid: [
    // With webpackChunkName comment
    {
      code: `import(/* webpackChunkName: "my-chunk" */ './module');`,
    },
    {
      code: `import(/* webpackChunkName: 'my-chunk' */ './module');`,
    },

    // With allowEmpty option
    {
      code: `import('./module');`,
      options: [{ allowEmpty: true }],
    },

    // Custom format
    {
      code: `import(/* webpackChunkName: "pages/home" */ './pages/home');`,
      options: [{ webpackChunknameFormat: '[a-zA-Z0-9-_/.]+' }],
    },
  ],

  invalid: [
    // Missing chunk name - has suggestion with expected output
    {
      code: `import('./module');`,
      errors: [
        {
          messageId: 'missingChunkName',
          suggestions: [
            {
              messageId: 'suggestChunkName',
              output: `import(/* webpackChunkName: "module" */ './module');`,
            },
          ],
        },
      ],
    },

    // Invalid chunk name format (doesn't match pattern)
    {
      code: `import(/* webpackChunkName: "invalid chunk!" */ './module');`,
      options: [{ webpackChunknameFormat: '[a-zA-Z0-9-]+' }],
      errors: [{ messageId: 'invalidChunkName' }],
    },

    // Chunk name with spaces (invalid with default format)
    {
      code: `import(/* webpackChunkName: "my chunk" */ './module');`,
      errors: [{ messageId: 'invalidChunkName' }],
    },
  ],
});
