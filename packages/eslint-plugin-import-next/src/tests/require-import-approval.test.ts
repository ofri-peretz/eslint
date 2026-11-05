/**
 * Tests for require-import-approval
 * Enforces explicit approval for high-risk package imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireImportApproval } from '../rules/require-import-approval';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const defaultOptions = {
  packages: [
    { package: 'approved-package', status: 'approved' as const },
    { package: '@approved/scope', status: 'approved' as const },
    { 
      package: 'pending-review', 
      status: 'pending' as const,
      reason: 'Security review in progress',
      alternative: 'approved-package',
    },
    {
      package: 'vulnerable-package',
      status: 'blocked' as const,
      reason: 'Known CVE-2024-12345',
      alternative: 'safe-alternative',
    },
    {
      package: '@blocked/*',
      status: 'blocked' as const,
      reason: 'Organization policy violation',
    },
  ],
  defaultPolicy: 'allow' as const,
};

const denyByDefaultOptions = {
  packages: [
    { package: 'react', status: 'approved' as const },
    { package: 'lodash-es', status: 'approved' as const },
  ],
  defaultPolicy: 'deny' as const,
};

ruleTester.run('require-import-approval', requireImportApproval, {
  valid: [
    // ✅ Approved package
    {
      code: `import { helper } from 'approved-package';`,
      options: [defaultOptions],
    },

    // ✅ Approved scoped package
    {
      code: `import { util } from '@approved/scope';`,
      options: [defaultOptions],
    },

    // ✅ Unlisted package with allow default
    {
      code: `import React from 'react';`,
      options: [defaultOptions],
    },

    // ✅ Relative import (not a package)
    {
      code: `import { helper } from './utils';`,
      options: [defaultOptions],
    },

    // ✅ Approved package in deny-by-default mode
    {
      code: `import React from 'react';`,
      options: [denyByDefaultOptions],
    },

    // ✅ Subpath of approved package
    {
      code: `import { debounce } from 'lodash-es/debounce';`,
      options: [denyByDefaultOptions],
    },
  ],

  invalid: [
    // ❌ Blocked package
    {
      code: `import { vuln } from 'vulnerable-package';`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },

    // ❌ Pending review package
    {
      code: `import { pending } from 'pending-review';`,
      options: [defaultOptions],
      errors: [{ messageId: 'unapprovedPackage' }],
    },

    // ❌ Blocked scoped package (wildcard)
    {
      code: `import { bad } from '@blocked/malicious';`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },

    // ❌ Unlisted package in deny-by-default mode
    {
      code: `import axios from 'axios';`,
      options: [denyByDefaultOptions],
      errors: [{ messageId: 'unapprovedPackage' }],
    },

    // ❌ Dynamic import with blocked package
    {
      code: `const pkg = await import('vulnerable-package');`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },

    // ❌ Require with blocked package
    {
      code: `const pkg = require('vulnerable-package');`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
ruleTester.run('require-import-approval fidelity', requireImportApproval, {
  valid: [
    {
      name: 'a Node.js builtin is not a package, even under deny',
      code: `import { readFile } from 'node:fs';\nimport path from 'path';`,
      options: [denyByDefaultOptions],
    },
    {
      name: 'a # subpath import is the package itself, not a dependency',
      code: `import { x } from '#lib/x';`,
      options: [denyByDefaultOptions],
    },
    {
      name: 'path aliases npm cannot publish under are not packages',
      code: `import a from '@/lib';\nimport b from '~/lib';`,
      options: [denyByDefaultOptions],
    },
  ],
  invalid: [
    {
      name: 'export { x } from a blocked package',
      code: `export { x } from 'vulnerable-package';`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },
    {
      name: 'export * from a blocked package',
      code: `export * from 'vulnerable-package';`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },
    {
      name: 'import x = require() of a blocked package',
      code: `import v = require('vulnerable-package');`,
      options: [defaultOptions],
      errors: [{ messageId: 'blockedPackage' }],
    },
  ],
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run('require-import-approval fidelity (other spellings)', requireImportApproval, {
  valid: [
    {
      name: "a local export and an import alias load nothing",
      code: "namespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };",
      options: [denyByDefaultOptions],
    },
  ],
  invalid: [
    {
      name: "an ignore pattern that names another package exempts nothing",
      code: "import v from 'vulnerable-package';",
      options: [{ ...defaultOptions, ignorePatterns: ['other-*'] }],
      errors: [{ messageId: 'blockedPackage' }],
    },
  ],
});
