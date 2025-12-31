/**
 * Tests for prefer-tree-shakeable-imports
 * Detects import patterns that prevent effective tree-shaking
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferTreeShakeableImports } from '../rules/prefer-tree-shakeable-imports';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-tree-shakeable-imports', preferTreeShakeableImports, {
  valid: [
    // ✅ Named imports (tree-shakeable)
    {
      code: `import { debounce, throttle } from 'lodash';`,
    },

    // ✅ Subpath import from lodash
    {
      code: `import debounce from 'lodash/debounce';`,
    },

    // ✅ Named imports from MUI
    {
      code: `import { Button, TextField } from '@mui/material';`,
    },

    // ✅ Subpath import from MUI
    {
      code: `import Button from '@mui/material/Button';`,
    },

    // ✅ Named imports from date-fns
    {
      code: `import { format, parseISO } from 'date-fns';`,
    },

    // ✅ Namespace import from non-target package
    {
      code: `import * as React from 'react';`,
    },

    // ✅ Default import from non-target package
    {
      code: `import React from 'react';`,
    },

    // ✅ Namespace import from user code (not a target package)
    {
      code: `import * as utils from './utils';`,
    },

    // ✅ Named imports from rxjs
    {
      code: `import { map, filter, switchMap } from 'rxjs/operators';`,
    },

    // ✅ Named imports from antd
    {
      code: `import { Button, Input, Form } from 'antd';`,
    },
  ],

  invalid: [
    // ❌ Namespace import from lodash
    {
      code: `import * as _ from 'lodash';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Default import from lodash (root)
    {
      code: `import _ from 'lodash';`,
      errors: [{ messageId: 'defaultImportFromLargePackage' }],
    },

    // ❌ Namespace import from @mui/material
    {
      code: `import * as MUI from '@mui/material';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Namespace import from @mui/icons-material
    {
      code: `import * as Icons from '@mui/icons-material';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Default import from @mui/material root
    {
      code: `import MUI from '@mui/material';`,
      errors: [{ messageId: 'defaultImportFromLargePackage' }],
    },

    // ❌ Namespace import from date-fns
    {
      code: `import * as dateFns from 'date-fns';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Default import from date-fns root
    {
      code: `import dateFns from 'date-fns';`,
      errors: [{ messageId: 'defaultImportFromLargePackage' }],
    },

    // ❌ Namespace import from rxjs
    {
      code: `import * as Rx from 'rxjs';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Namespace import from ramda
    {
      code: `import * as R from 'ramda';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Namespace import from antd
    {
      code: `import * as Antd from 'antd';`,
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Default import from antd root
    {
      code: `import Antd from 'antd';`,
      errors: [{ messageId: 'defaultImportFromLargePackage' }],
    },

    // ❌ Custom target package via configuration
    {
      code: `import * as MyLib from 'my-large-lib';`,
      options: [
        {
          targetPackages: [{ name: 'my-large-lib', preferNamed: true }],
        },
      ],
      errors: [{ messageId: 'namespaceImport' }],
    },

    // ❌ Block all namespace imports mode
    {
      code: `import * as utils from './utils';`,
      options: [{ blockAllNamespaceImports: true }],
      errors: [{ messageId: 'namespaceImport' }],
    },
  ],
});
