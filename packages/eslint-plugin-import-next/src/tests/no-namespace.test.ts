/**
 * Tests for no-namespace
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noNamespace } from '../rules/no-namespace';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-namespace', noNamespace, {
  valid: [
    // Named imports
    { code: `import { foo } from 'foo';` },
    { code: `import { foo, bar } from 'foo';` },

    // Default import
    { code: `import foo from 'foo';` },

    // Combined default and named
    { code: `import foo, { bar } from 'foo';` },

    // Ignored patterns
    {
      code: `import * as lodash from 'lodash';`,
      options: [{ ignore: ['lodash'] }],
    },
    {
      code: `import * as utils from './utils';`,
      options: [{ ignore: ['./utils'] }],
    },
    {
      code: `import * as lib from '@scope/lib';`,
      options: [{ ignore: ['@scope/*'] }],
    },
  ],

  invalid: [
    // Namespace import
    {
      code: `import * as foo from 'foo';`,
      errors: [{ messageId: 'noNamespace' }],
    },

    // Namespace with default
    {
      code: `import defaultExport, * as ns from 'module';`,
      errors: [{ messageId: 'noNamespace' }],
    },

    // Not in ignore list
    {
      code: `import * as lodash from 'lodash';`,
      options: [{ ignore: ['react'] }],
      errors: [{ messageId: 'noNamespace' }],
    },

    // Scoped package not ignored
    {
      code: `import * as lib from '@other/lib';`,
      options: [{ ignore: ['@scope/*'] }],
      errors: [{ messageId: 'noNamespace' }],
    },
  ],
});
