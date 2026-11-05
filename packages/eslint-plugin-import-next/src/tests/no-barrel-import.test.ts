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
      name: 'an import of the file itself',
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
      name: 'an import through a directory index',
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

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
// no_barrel_import): type-only imports were reported though they load
// nothing, `import()` / `require()` / `import x = require()` were not read,
// and `ignoredPackages` stopped working under `ignoreNodeModules: false`.
const known = [{ knownBarrels: ['components$', '^ui-kit$'] }];
ruleTester.run('no-barrel-import - fidelity', noBarrelImport, {
  valid: [
    {
      name: 'import type from a barrel',
      code: "import type { P } from './components';",
      options: known,
    },
    {
      name: 'inline type imports only',
      code: "import { type P } from './components';",
      options: known,
    },
    {
      name: 'export type from a barrel',
      code: "export type { P } from './components';",
      options: known,
    },
    {
      name: 'export type * from a barrel',
      code: "export type * from './components';",
      options: known,
    },
    {
      name: 'import type x = require() of a barrel',
      code: "import type x = require('./components');",
      options: known,
    },
    {
      name: 'import x = Namespace.member',
      code: 'namespace N { export const v = 1; }\nimport x = N.v;',
      options: known,
    },
    {
      name: 'a computed import()',
      code: 'const load = (p: string) => import(p);',
      options: known,
    },
    {
      name: 'a call that is not require()',
      code: "load('./components');",
      options: known,
    },
    {
      name: 'ignoredPackages applies with ignoreNodeModules: false',
      code: "import { Button } from 'ui-kit';",
      options: [
        {
          knownBarrels: ['^ui-kit$'],
          ignoredPackages: ['^ui-kit'],
          ignoreNodeModules: false,
        },
      ],
    },
  ],
  invalid: [
    {
      name: 'import() of a barrel',
      code: "const load = () => import('./components');",
      options: known,
      errors: [{ messageId: 'barrelImportDetected' }],
    },
    {
      name: 'require() of a barrel',
      code: "const c = require('./components');",
      options: known,
      errors: [{ messageId: 'barrelImportDetected' }],
    },
    {
      name: 'TS import x = require() of a barrel',
      code: "import c = require('./components');",
      options: known,
      errors: [{ messageId: 'barrelImportDetected' }],
    },
    {
      name: 'a value import beside an inline type one still loads the barrel',
      code: "import { type P, Button } from './components';",
      options: known,
      errors: [{ messageId: 'barrelImportDetected' }],
    },
  ],
});
