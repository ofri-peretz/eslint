/**
 * Tests for no-named-default
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noNamedDefault } from '../rules/no-named-default';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-named-default', noNamedDefault, {
  valid: [
    // Normal default import
    { name: 'a default import', code: `import foo from 'foo';` },

    // Named imports
    { code: `import { bar } from 'bar';` },
    { code: `import { bar, baz } from 'bar';` },

    // Namespace import
    { code: `import * as foo from 'foo';` },

    // Combined default and named
    { code: `import foo, { bar } from 'foo';` },

    // Re-naming a non-default export
    { code: `import { foo as bar } from 'foo';` },
  ],

  invalid: [
    // Named import of default
    {
      name: '`{ default as foo }` where a default import says the same thing',
      code: `import { default as foo } from 'foo';`,
      errors: [{ messageId: 'namedDefault' }],
    },

    // Named import of default with other imports
    {
      code: `import { default as foo, bar } from 'foo';`,
      errors: [{ messageId: 'namedDefault' }],
    },

    // Just default keyword
    {
      code: `import { default as myDefault } from 'module';`,
      errors: [{ messageId: 'namedDefault' }],
    },
  ],
});
