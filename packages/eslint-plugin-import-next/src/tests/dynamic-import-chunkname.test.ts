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

// webpack reads a magic comment as the body of an object literal. One it
// cannot read is dropped, the chunk name with it; a known option of the wrong
// type is ignored with a warning. eslint-plugin-import reports both.
ruleTester.run(
  'dynamic-import-chunkname: magic comments webpack reads',
  dynamicImportChunkname,
  {
    valid: [
      {
        name: 'every documented option, with the values webpack accepts',
        code: `import(/* webpackChunkName: "a", webpackMode: "lazy-once", webpackPrefetch: -1, webpackPreload: true, webpackIgnore: false, webpackInclude: /\\.json$/i, webpackExclude: /[/]x[/]/, webpackExports: ["default", 'named'], */ './module');`,
      },
      {
        name: 'options spread over several comments, and a comment that is not webpack',
        code: `import(/* a note */ /* webpackPrefetch: 1.5e3 */ /* webpackChunkName: 'b' */ /* webpackExports: "x" */ './module');`,
      },
      {
        name: 'an option webpack does not document is not judged',
        code: `import(/* webpackChunkName: "a", webpackFetchPriority: "high", webpackOther: null, webpackList: [] */ './module');`,
      },
      {
        name: 'a quoted key and an escaped quote in a name',
        code: `import(/* "webpackMode": "weak", webpackChunkName: "a\\"b" */ './module');`,
        options: [{ webpackChunknameFormat: '.+' }],
      },
      {
        name: 'eager mode spread over two comments still names no chunk',
        code: `import(/* webpackChunkName: "a" */ /* webpackMode: 'eager' */ './module');`,
      },
    ],
    invalid: [
      {
        name: 'a stray semicolon: webpack cannot read the comment',
        code: `import(/* webpackChunkName: "a" ; */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'prose before the key: webpack cannot read the comment',
        code: `import(/* totally not webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'a key with no colon',
        code: `import(/* webpackChunkName "a" webpackMode: "lazy" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'a key that is not a name',
        code: `import(/* 12: 1, webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'a value that is not a literal',
        code: `import(/* webpackChunkName: chunk, webpackMode: "lazy" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'an array with a missing comma',
        code: `import(/* webpackChunkName: "a", webpackExports: ["a" "b"] */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'an array with an unreadable item',
        code: `import(/* webpackChunkName: "a", webpackExports: [a] */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'webpackPrefetch takes true or a number, not a string',
        code: `import(/* webpackPrefetch: "module", webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'webpackIgnore takes a boolean',
        code: `import(/* webpackIgnore: "no", webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'webpackInclude takes a regular expression',
        code: `import(/* webpackInclude: "a", webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'webpackMode takes one of its four modes',
        code: `import(/* webpackMode: "fast", webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'webpackExports takes a name or a list of names',
        code: `import(/* webpackExports: [true], webpackChunkName: "a" */ './module');`,
        errors: [{ messageId: 'invalidMagicComment' }],
      },
      {
        name: 'an unreadable comment is reported even when a chunk name may be absent',
        code: `import(/* webpackPreload: "module" */ './module');`,
        options: [{ allowEmpty: true }],
        errors: [{ messageId: 'invalidMagicComment' }],
      },
    ],
  },
);
