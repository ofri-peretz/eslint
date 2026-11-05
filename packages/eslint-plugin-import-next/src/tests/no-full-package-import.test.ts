/**
 * Tests for no-full-package-import
 * Blocks full imports from known large packages
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noFullPackageImport } from '../rules/no-full-package-import';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-full-package-import', noFullPackageImport, {
  valid: [
    // ✅ Subpath import from lodash
    {
      name: 'a deep import of the one function',
      code: `import debounce from 'lodash/debounce';`,
    },

    // ✅ Subpath import from lodash (deep)
    {
      code: `import get from 'lodash/get';`,
    },

    // ✅ Named imports from lodash-es (tree-shakeable)
    {
      code: `import { debounce, throttle } from 'lodash-es';`,
    },

    // ✅ Named imports from rxjs
    {
      code: `import { Observable, Subject } from 'rxjs';`,
    },

    // ✅ Subpath import from rxjs/operators
    {
      code: `import { map, filter } from 'rxjs/operators';`,
    },

    // ✅ React is not blocked
    {
      code: `import React from 'react';`,
    },

    // ✅ Namespace from React is fine
    {
      code: `import * as React from 'react';`,
    },

    // ✅ Individual icon import (FontAwesome)
    {
      code: `import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';`,
    },

    // ✅ AWS SDK v3 (modular)
    {
      code: `import { S3Client } from '@aws-sdk/client-s3';`,
    },

    // ✅ Package not in blocklist
    {
      code: `import axios from 'axios';`,
    },

    // ✅ Side-effect import
    {
      code: `import 'lodash';`,
    },

    // ✅ Named import from ramda (tree-shakeable)
    {
      code: `import { compose, pipe } from 'ramda';`,
    },
  ],

  invalid: [
    // ❌ Default import from lodash
    {
      name: 'importing all of lodash to use one function',
      code: `import _ from 'lodash';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Namespace import from lodash
    {
      code: `import * as _ from 'lodash';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Default import from lodash-es
    {
      code: `import lodash from 'lodash-es';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Namespace import from rxjs
    {
      code: `import * as Rx from 'rxjs';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Default import from ramda
    {
      code: `import R from 'ramda';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Namespace import from ramda
    {
      code: `import * as R from 'ramda';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Default import from moment
    {
      code: `import moment from 'moment';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Default import from underscore
    {
      code: `import _ from 'underscore';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Namespace import from FontAwesome
    {
      code: `import * as Icons from '@fortawesome/free-solid-svg-icons';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Default import from aws-sdk (v2)
    {
      code: `import AWS from 'aws-sdk';`,
      errors: [{ messageId: 'fullPackageImport' }],
    },

    // ❌ Custom blocked package
    {
      code: `import BigLib from 'huge-library';`,
      options: [
        {
          blockedPackages: [
            {
              name: 'huge-library',
              suggestion: 'Use subpath imports',
              example: "import { thing } from 'huge-library/thing';",
            },
          ],
        },
      ],
      errors: [{ messageId: 'fullPackageImport' }],
    },
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
const fidelityBlocked = {
  blockedPackages: [{ name: 'big', suggestion: 'Use subpath imports' }],
};
ruleTester.run('no-full-package-import fidelity', noFullPackageImport, {
  valid: [
    {
      name: 'import type of the whole package is erased and bundles nothing',
      code: `import type Big from 'big';`,
      options: [fidelityBlocked],
    },
    {
      name: 'a destructured require takes named members',
      code: `const { a } = require('big');`,
      options: [fidelityBlocked],
    },
  ],
  invalid: [
    {
      name: 'const x = require() binds the whole package',
      code: `const big = require('big');`,
      options: [fidelityBlocked],
      errors: [{ messageId: 'fullPackageImport' }],
    },
    {
      name: 'import x = require() binds the whole package',
      code: `import big = require('big');`,
      options: [fidelityBlocked],
      errors: [{ messageId: 'fullPackageImport' }],
    },
  ],
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run(
  'no-full-package-import fidelity (other spellings)',
  noFullPackageImport,
  {
    valid: [
      {
        name: 'require of a non-string, of an unlisted package, and an import alias',
        code: "const a = require(42);\nconst b = require('other');\nnamespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };",
        options: [fidelityBlocked],
      },
    ],
    invalid: [],
  },
);
