/**
 * Tests for no-legacy-imports
 * Detects imports from deprecated internal paths and suggests alternatives
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noLegacyImports } from '../rules/no-legacy-imports';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const defaultOptions = {
  mappings: [
    {
      deprecated: 'moment',
      replacement: 'date-fns',
      reason: 'moment.js is in maintenance mode',
      since: '2020-09-01',
    },
    {
      deprecated: '@legacy/utils',
      replacement: '@company/utils',
      reason: 'package renamed in v2.0',
      since: '2024-01-01',
      deadline: '2025-06-30',
    },
    {
      deprecated: 'src/old-api/.*',
      replacement: 'src/api',
      reason: 'old API being phased out',
    },
    {
      deprecated: '@internal/deprecated-.*',
      replacement: '@internal/v2',
      reason: 'v1 APIs deprecated',
    },
    {
      deprecated: 'lodash$',
      replacement: 'lodash-es',
      reason: 'use ES modules version for tree-shaking',
    },
  ],
};

ruleTester.run('no-legacy-imports', noLegacyImports, {
  valid: [
    // ✅ Modern replacement
    {
      name: 'date-fns',
      code: `import { format } from 'date-fns';`,
      options: [defaultOptions],
    },

    // ✅ New package name
    {
      code: `import { debounce } from '@company/utils';`,
      options: [defaultOptions],
    },

    // ✅ New API path
    {
      code: `import { fetchUser } from 'src/api/user';`,
      options: [defaultOptions],
    },

    // ✅ lodash-es (allowed)
    {
      code: `import { debounce } from 'lodash-es';`,
      options: [defaultOptions],
    },

    // ✅ lodash subpath (not full package)
    {
      code: `import debounce from 'lodash/debounce';`,
      options: [defaultOptions],
    },

    // ✅ Unrelated import
    {
      code: `import React from 'react';`,
      options: [defaultOptions],
    },
  ],

  invalid: [
    // ❌ moment.js (deprecated)
    {
      name: 'moment, where date-fns is the modern replacement',
      code: `import moment from 'moment';`,
      output: `import moment from 'date-fns';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ Old package name
    {
      code: `import { debounce } from '@legacy/utils';`,
      output: `import { debounce } from '@company/utils';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ Old API path (regex match)
    {
      code: `import { fetchUser } from 'src/old-api/user';`,
      output: `import { fetchUser } from 'src/api';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ Deprecated internal package (regex)
    {
      code: `import { Widget } from '@internal/deprecated-widgets';`,
      output: `import { Widget } from '@internal/v2';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ Full lodash import
    {
      code: `import _ from 'lodash';`,
      output: `import _ from 'lodash-es';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ Dynamic import with deprecated module
    {
      code: `const m = await import('moment');`,
      output: `const m = await import('date-fns');`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },

    // ❌ require with deprecated module
    {
      code: `const m = require('@legacy/utils');`,
      output: `const m = require('@company/utils');`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
ruleTester.run('no-legacy-imports fidelity', noLegacyImports, {
  valid: [],
  invalid: [
    {
      name: 'export { x } from a deprecated path',
      code: `export { format } from '@legacy/utils';`,
      output: `export { format } from '@company/utils';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },
    {
      name: 'export * from a deprecated path',
      code: `export * from '@legacy/utils';`,
      output: `export * from '@company/utils';`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },
    {
      name: 'import x = require() of a deprecated path',
      code: `import utils = require('@legacy/utils');`,
      output: `import utils = require('@company/utils');`,
      options: [defaultOptions],
      errors: [{ messageId: 'legacyImport' }],
    },
  ],
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run(
  'no-legacy-imports fidelity (other spellings)',
  noLegacyImports,
  {
    valid: [
      {
        name: 'a local export and an import alias load nothing',
        code: 'namespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };',
        options: [defaultOptions],
      },
    ],
    invalid: [],
  },
);
