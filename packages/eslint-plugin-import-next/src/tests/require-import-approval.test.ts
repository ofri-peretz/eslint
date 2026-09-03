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
