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
    {
      name: "webpack's [request] placeholder is a valid chunk name",
      code: 'import(/* webpackChunkName: "[request]" */ `./locale/${lang}`);',
    },
    {
      name: 'webpackMode eager makes no chunk, so there is nothing to name',
      code: `import(/* webpackMode: "eager" */ './module');`,
    },
    {
      name: 'a call not listed in importFunctions is not a dynamic import',
      code: `load('./module');`,
    },
    {
      name: 'importFunctions: a listed call with a chunk name',
      code: `dynamicImport(/* webpackChunkName: "my-chunk" */ './module');`,
      options: [{ importFunctions: ['dynamicImport'] }],
    },
    // With webpackChunkName comment
    {
      name: 'a webpackChunkName comment',
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
    {
      name: 'importFunctions: a listed call with no chunk name',
      code: `dynamicImport('./module');`,
      options: [{ importFunctions: ['dynamicImport'] }],
      errors: [
        {
          messageId: 'missingChunkName',
          suggestions: [
            {
              messageId: 'suggestChunkName',
              output: `dynamicImport(/* webpackChunkName: "module" */ './module');`,
            },
          ],
        },
      ],
    },
    // Missing chunk name - has suggestion with expected output
    {
      name: 'a dynamic import with no chunk name — the bundle gets a number',
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
