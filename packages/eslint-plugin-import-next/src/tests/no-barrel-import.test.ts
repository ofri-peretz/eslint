/**
 * Tests for no-barrel-import
 * Flags imports from barrel files to encourage direct imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBarrelImport } from '../rules/no-barrel-import';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-barrel-import', noBarrelImport, {
  valid: [
    // ✅ Direct import with file extension
    {
      code: `import { Button } from './components/Button.tsx';`,
    },

    // ✅ Direct import (without /index suffix) - cant tell if its a file or dir
    {
      code: `import { formatDate } from './utils/date';`,
    },

    // ✅ Node modules import (ignored by default)
    {
      code: `import React from 'react';`,
    },

    // ✅ Scoped package (ignored by default)
    {
      code: `import { useState } from 'react';`,
    },

    // ✅ Deep package import (direct path)
    {
      code: `import Button from '@mui/material/Button';`,
    },

    // ✅ Lodash subpath import (tree-shakeable)
    {
      code: `import debounce from 'lodash/debounce';`,
    },

    // ✅ Relative import with specific file
    {
      code: `import { helper } from '../utils/helpers';`,
    },

    // ✅ Ignored package in configuration
    {
      code: `import { Button } from '@mui/material';`,
      options: [{ ignoredPackages: ['@mui/material'] }],
    },

    // ✅ Alias import (without /index suffix - can't determine without FS)
    {
      code: `import { Button } from '@/components';`,
    },

    // ✅ Directory import (can't determine without FS access)
    {
      code: `import { Modal } from './components';`,
    },
  ],

  invalid: [
    // ❌ Explicit index import (clear barrel)
    {
      code: `import { config } from './config/index';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Explicit index.ts import
    {
      code: `import { utils } from './lib/index.ts';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Explicit index.tsx import
    {
      code: `import { Component } from './ui/index.tsx';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Explicit index.js import
    {
      code: `import { fn } from './helpers/index.js';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Explicit index.mjs import
    {
      code: `import { esm } from './esm/index.mjs';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Re-export from explicit index
    {
      code: `export * from './shared/index';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Named re-export from explicit index
    {
      code: `export { Button } from './components/index';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Known barrel via configuration
    {
      code: `import { Button } from '@/components';`,
      options: [{ knownBarrels: ['^@/components$'] }],
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Multiple known barrels
    {
      code: `import { formatDate } from '~/utils';`,
      options: [{ knownBarrels: ['^~/utils$', '^@/components$'] }],
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Regex pattern matching
    {
      code: `import { AuthProvider } from '@/features/auth';`,
      options: [{ knownBarrels: ['^@/features/'] }],
      errors: [{ messageId: 'barrelImportDetected' }],
    },

    // ❌ Multiple imports from explicit index
    {
      code: `import { Button, Modal, Table } from './ui/index';`,
      errors: [{ messageId: 'barrelImportDetected' }],
    },
  ],
});
