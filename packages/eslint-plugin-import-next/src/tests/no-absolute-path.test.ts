/**
 * Tests for no-absolute-path
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noAbsolutePath } from '../rules/no-absolute-path';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-absolute-path', noAbsolutePath, {
  valid: [
    // Relative imports are allowed
    { code: `import foo from './foo';` },
    { code: `import foo from '../foo';` },
    { code: `import foo from '../../utils/foo';` },

    // Package imports are allowed
    { code: `import lodash from 'lodash';` },
    { code: `import { useState } from 'react';` },
    { code: `import fs from 'node:fs';` },

    // Dynamic imports with relative paths
    { code: `const module = await import('./module');` },

    // CommonJS with relative paths
    { code: `const foo = require('./foo');` },

    // Disabled checks
    {
      code: `const foo = require('/absolute/path');`,
      options: [{ commonjs: false }],
    },
    {
      code: `import foo from '/absolute/path';`,
      options: [{ esmodule: false }],
    },
  ],

  invalid: [
    // ES Module absolute import - with expected output
    {
      code: `import foo from '/absolute/path/to/foo';`,
      errors: [{ messageId: 'absolutePath' }],
      output: `import foo from '../../../../../absolute/path/to/foo';`,
    },
    {
      code: `import { bar } from '/usr/local/lib/bar';`,
      errors: [{ messageId: 'absolutePath' }],
      output: `import { bar } from '../../../../../usr/local/lib/bar';`,
    },

    // Dynamic import with absolute path
    {
      code: `const module = await import('/absolute/module');`,
      errors: [{ messageId: 'absolutePath' }],
      output: `const module = await import('../../../../../absolute/module');`,
    },

    // CommonJS require with absolute path
    {
      code: `const foo = require('/absolute/path/to/foo');`,
      errors: [{ messageId: 'absolutePath' }],
      output: `const foo = require('../../../../../absolute/path/to/foo');`,
    },

    // AMD when enabled
    {
      code: `define('/absolute/path', function() {});`,
      options: [{ amd: true }],
      errors: [{ messageId: 'absolutePath' }],
      output: `define('../../../../../absolute/path', function() {});`,
    },
  ],
});
