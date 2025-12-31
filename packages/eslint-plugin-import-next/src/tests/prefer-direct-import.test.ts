/**
 * Tests for prefer-direct-import
 * Suggests direct imports over barrel imports with autofix
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferDirectImport } from '../rules/prefer-direct-import';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-direct-import', preferDirectImport, {
  valid: [
    // ✅ Direct import (already using component path)
    {
      code: `import { Button } from '@/components/Button';`,
    },

    // ✅ Non-matching barrel path (not configured)
    {
      code: `import { something } from '@/services';`,
    },

    // ✅ External package (not a barrel)
    {
      code: `import React from 'react';`,
    },

    // ✅ Default import from barrel (not flagged - might be intentional)
    {
      code: `import components from '@/components';`,
    },

    // ✅ Namespace import from barrel (handled by prefer-tree-shakeable-imports)
    {
      code: `import * as Components from '@/components';`,
    },

    // ✅ Side-effect import
    {
      code: `import '@/styles/global.css';`,
    },

    // ✅ Type-only import (often valid from barrels)
    {
      code: `import type { ButtonProps } from '@/components';`,
    },

    // ✅ Path not in mappings
    {
      code: `import { helper } from './utils';`,
    },
  ],

  invalid: [
    // ❌ Single named import from barrel
    {
      code: `import { Button } from '@/components';`,
      output: `import { Button } from '@/components/Button';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from hooks barrel
    {
      code: `import { useAuth } from '@/hooks';`,
      output: `import { useAuth } from '@/hooks/useAuth';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from utils barrel
    {
      code: `import { formatDate } from '@/utils';`,
      output: `import { formatDate } from '@/utils/formatDate';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Single named import from lib barrel
    {
      code: `import { fetcher } from '@/lib';`,
      output: `import { fetcher } from '@/lib/fetcher';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Tilde alias barrel
    {
      code: `import { Modal } from '~/components';`,
      output: `import { Modal } from '~/components/Modal';`,
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ Multiple named imports (reports on each specifier)
    {
      code: `import { Button, Modal } from '@/components';`,
      errors: [
        { messageId: 'preferDirectImport' },
        { messageId: 'preferDirectImport' },
      ],
    },

    // ❌ Custom mapping via configuration
    {
      code: `import { DataTable } from '@acme/ui';`,
      output: `import { DataTable } from '@acme/ui/DataTable';`,
      options: [
        {
          mappings: [{ barrel: '^@acme/ui$', directPath: '@acme/ui/{name}' }],
        },
      ],
      errors: [{ messageId: 'preferDirectImport' }],
    },

    // ❌ With autoFix disabled (suggestion only, no fix applied)
    {
      code: `import { Icon } from '@/components';`,
      options: [
        {
          autoFix: false,
          mappings: [{ barrel: '^@/components$', directPath: '@/components/{name}' }],
        },
      ],
      errors: [
        {
          messageId: 'preferDirectImport',
          suggestions: [{ messageId: 'preferDirectImport', output: `import { Icon } from '@/components/Icon';` }],
        },
      ],
    },
  ],
});
